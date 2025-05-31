import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateQuiz } from "@/lib/utils";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        const content_id = params.get("content_id");

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

        // If no metadata exists or no quiz in metadata, create it
        if (!existingMetadata) {
            await prisma.metadata.create({
                data: {
                    content_id: content_id,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
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

        // Generate quiz - no need to parse as generateQuiz now returns the parsed object
        const { quiz } = await generateQuiz(transcriptText);
        if (!quiz) {
            return NextResponse.json({ message: "Could not generate quiz" }, { status: 500 });
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
        return NextResponse.json({ message: "Error while generating quiz content!" }, { status: 500 });
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

