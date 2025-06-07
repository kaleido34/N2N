import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateQuiz } from "@/lib/utils";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
    // Declare content_id at the top level so it's available in catch blocks
    let content_id: string | null = null;
    
    try {
        const params = req.nextUrl.searchParams;
        content_id = params.get("content_id");

        // Authenticate the user
        const { user, error } = await authenticateUser(req);
        if (error) return error;

        if (!content_id) {
            return NextResponse.json(
                { message: "Please provide content_id!" },
                { status: 400 }
            );
        }

        // Check if user has access to content
        const hasAccess = await checkContentAccess(user.user_id, content_id);
        if (!hasAccess) {
            return NextResponse.json(
                { message: "Content not found for the user!" },
                { status: 403 }
            );
        }

        // First check if we already have metadata with quiz for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        if (existingMetadata?.quiz) {
            return NextResponse.json({
                message: "Found quiz successfully!",
                data: existingMetadata.quiz
            }, { status: 200 });
        }

        // Check if metadata exists, create it if needed
        let metadataRecord = existingMetadata;
        if (!metadataRecord) {
            try {
                metadataRecord = await prisma.metadata.create({
                    data: {
                        content_id: content_id,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
            } catch (createError) {
                // If there's a unique constraint error, the metadata was created by another concurrent request
                // Fetch it instead
                metadataRecord = await prisma.metadata.findUnique({
                    where: { content_id: content_id }
                });
                
                // If still not found, something else went wrong
                if (!metadataRecord) {
                    throw createError;
                }
            }
        }

        // Get content type and retrieve transcript based on content type
        const content = await prisma.content.findUnique({
            where: { content_id },
            include: {
                youtubeContent: true,
                documentContent: true,
                audioContent: true,
                imageContent: true
            }
        });

        if (!content) {
            return NextResponse.json({ message: "Content not found" }, { status: 404 });
        }

        let transcriptText = "";

        // Get transcript based on content type
        switch (content.content_type) {
            case "YOUTUBE_CONTENT":
                if (!content.youtubeContent?.transcript) {
                    return NextResponse.json({ message: "No transcript found for this video" }, { status: 404 });
                }
                // Handle different transcript formats
                if (Array.isArray(content.youtubeContent.transcript)) {
                    const transcripts = content.youtubeContent.transcript
                        .filter((chunk): chunk is { text: string } => 
                            typeof chunk === 'object' && chunk !== null && 'text' in chunk
                        )
                        .map(chunk => chunk.text);
                    transcriptText = transcripts.join(" ").trim();
                } else {
                    transcriptText = String(content.youtubeContent.transcript);
                }
                break;
                
            case "DOCUMENT_CONTENT":
                if (!content.documentContent) {
                    return NextResponse.json({ message: "No document content found" }, { status: 404 });
                }
                const docContent = content.documentContent as { text?: unknown };
                transcriptText = docContent.text ? String(docContent.text) : "";
                break;
                
            case "AUDIO_CONTENT":
                if (!content.audioContent?.transcript) {
                    return NextResponse.json({ message: "No transcript found for this audio" }, { status: 404 });
                }
                // Handle different transcript formats
                const audioTranscript = content.audioContent.transcript;
                if (typeof audioTranscript === 'object' && audioTranscript !== null && 'text' in audioTranscript) {
                    transcriptText = String((audioTranscript as { text: unknown }).text || "");
                } else {
                    transcriptText = JSON.stringify(audioTranscript);
                }
                break;
                
            case "IMAGE_CONTENT":
                if (!content.imageContent?.text) {
                    return NextResponse.json({ message: "No text found for this image" }, { status: 404 });
                }
                transcriptText = content.imageContent.text;
                break;
                
            default:
                return NextResponse.json({ message: "Unsupported content type" }, { status: 400 });
        }

        // Generate quiz with error handling
        let quiz;
        try {
            // Try to fetch existing quiz from metadata first
            if (metadataRecord?.quiz && Object.keys(metadataRecord.quiz).length > 0) {
                console.log('Using existing quiz from metadata');
                quiz = metadataRecord.quiz;
            } else {
                console.log('Generating new quiz...');
                const result = await generateQuiz(transcriptText);
                
                // Ensure quiz has the correct structure
                if (result && result.quiz && Array.isArray(result.quiz)) {
                    // Already in correct format
                    quiz = result;
                } else if (result && Array.isArray(result)) {
                    // Handle case where the result is directly an array
                    quiz = { quiz: result };
                } else if (result && (result as any).questions && Array.isArray((result as any).questions)) {
                    // Handle legacy format with 'questions' property
                    quiz = { quiz: (result as any).questions };
                } else {
                    throw new Error('Invalid quiz format returned');
                }
            }
        } catch (generateError) {
            console.error('Error generating quiz:', generateError);
            
            // Provide a fallback quiz when generation fails
            quiz = {
                quiz: [
                    {
                        question: "The quiz service is currently unavailable. Which of the following is the most likely reason?",
                        options: [
                            "The service is experiencing high load",
                            "There was an error parsing the response",
                            "The system is undergoing maintenance",
                            "All of the above"
                        ],
                        correct_option: "All of the above",
                        explanation: "The quiz service is temporarily unavailable due to high demand or service limitations. Please try again later.",
                        source_reference: "System Status"
                    }
                ]
            };
        }
        
        // Normalize quiz structure if needed
        if (quiz && typeof quiz === 'object') {
            // If quiz has questions property but no quiz property, convert it
            if (!('quiz' in quiz) && 'questions' in quiz && Array.isArray((quiz as any).questions)) {
                quiz = { quiz: (quiz as any).questions };
            } 
            // Make sure quiz has a valid quiz array
            else if (!('quiz' in quiz) || !Array.isArray((quiz as any).quiz)) {
                // Fallback to default structure if the quiz object is invalid
                quiz = {
                    quiz: [
                        {
                            question: "The quiz data is in an unexpected format. Please try again later.",
                            options: ["Technical issue", "Data formatting error", "Service limitation", "All of the above"],
                            correct_option: "All of the above",
                            explanation: "The quiz service encountered a data formatting issue.",
                            source_reference: "System Status"
                        }
                    ]
                };
            }
        }

        // Save the quiz in metadata
        await prisma.metadata.update({
            where: { content_id: content_id },
            data: { quiz: quiz }
        });

        return NextResponse.json({
            message: `Successfully created quiz for content_id: ${content_id}`,
            data: quiz
        });
    } catch (error) {
        console.error('Error in quiz generation endpoint:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        
        // Try to provide a fallback quiz when there's an error
        try {
            // Return a fallback quiz that matches the structure expected by generateQuiz
            const fallbackQuiz = {
                quiz: [
                    {
                        question: "The quiz generation service is currently unavailable. Which of the following is the most likely reason?",
                        options: [
                            "The service is experiencing high load",
                            "There was an error parsing the response",
                            "The system is undergoing maintenance",
                            "All of the above"
                        ],
                        correct_option: "All of the above",
                        explanation: "The quiz service is temporarily unavailable. Please try again later.",
                        source_reference: "System Status"
                    }
                ]
            };
            
            // Only try to save if we have a content_id
            if (content_id) {
                // Save the fallback quiz in metadata
                await prisma.metadata.update({
                    where: { content_id },
                    data: { quiz: fallbackQuiz }
                });
            }
            
            return NextResponse.json({
                message: `Quiz generation encountered an error but provided a fallback.`,
                data: fallbackQuiz,
                error: error instanceof Error ? error.message : String(error)
            });
        } catch (fallbackError) {
            console.error('Failed to provide fallback quiz:', fallbackError);
            return NextResponse.json({ 
                message: "Error while generating quiz content!", 
                error: error instanceof Error ? error.message : String(error)
            }, { status: 500 });
        }
    }
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate the user
        const { user, error } = await authenticateUser(req);
        if (error) return error;

        const body = await req.json();
        const { text, video_id, content_id } = body;

        if (!content_id) {
            return NextResponse.json(
                { message: "Please provide content_id!" },
                { status: 400 }
            );
        }

        // Check if user has access to content
        const hasAccess = await checkContentAccess(user.user_id, content_id);
        if (!hasAccess) {
            return NextResponse.json(
                { message: "Content not found for the user!" },
                { status: 403 }
            );
        }

        if (!text) {
            return NextResponse.json(
                { message: "Please provide text to generate quiz from!" },
                { status: 400 }
            );
        }

        // Generate quiz - no need to parse as generateQuiz now returns the parsed object
        const { quiz } = await generateQuiz(text);

        // Save the quiz in metadata
        await prisma.metadata.upsert({
            where: { content_id },
            update: { 
                quiz: quiz,
                updated_at: new Date() 
            },
            create: {
                content_id,
                quiz: quiz,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            message: `Successfully created quiz for content_id: ${content_id}`,
            data: quiz
        });
    } catch (error) {
        console.error("Error in quiz generation:", error);
        return NextResponse.json(
            { message: "Error while generating quiz content!" },
            { status: 500 }
        );
    }
}

