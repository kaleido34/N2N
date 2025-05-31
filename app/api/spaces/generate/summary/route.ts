import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { summarizeChunks } from "@/lib/utils";
import { v4 as uuid } from "uuid";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";

// Import parseAiResponse helper
const aiUtils = import('@/lib/ai-utils').then(module => module.parseAiResponse);

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        const content_id = params.get("content_id");
        const force = params.get("force") === "true";

        // Authenticate user with centralized helper
        const { user, error } = await authenticateUser(req);
        if (error) {
            return error;
        }

        if (!content_id) {
            return NextResponse.json({ message: "Please provide content_id!" }, { status: 400 });
        }

        // Check if user has access to this content
        const hasAccess = await checkContentAccess(user.user_id, content_id);
        if (!hasAccess) {
            return NextResponse.json({ message: "Content not found or not accessible" }, { status: 403 });
        }

        // First check if we already have metadata with summary for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        // Return existing summary unless force regeneration is requested
        if (existingMetadata?.summary && !force) {
            return NextResponse.json({
                message: "Found summary successfully!",
                data: existingMetadata.summary
            }, { status: 200 });
        }

        // If no metadata exists or no summary in metadata, create it
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
                const transcripts = (content.youtubeContent.transcript as any[]).map(chunk => chunk.text);
                transcriptText = transcripts.join(" ");
                break;
                
            case "DOCUMENT_CONTENT":
                if (!content.documentContent?.text) {
                    return NextResponse.json({ message: "No text found for this document" }, { status: 404 });
                }
                transcriptText = content.documentContent.text;
                break;
                
            case "AUDIO_CONTENT":
                if (!content.audioContent?.transcript) {
                    return NextResponse.json({ message: "No transcript found for this audio" }, { status: 404 });
                }
                // Extract full text from segments if available
                // Type safe handling of transcript which could be various formats
                if (typeof content.audioContent.transcript === 'object' && 
                    content.audioContent.transcript !== null && 
                    'text' in content.audioContent.transcript) {
                    transcriptText = (content.audioContent.transcript as any).text;
                } else {
                    transcriptText = JSON.stringify(content.audioContent.transcript);
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

        // Generate summary
        const summaryText = await summarizeChunks(transcriptText);
        if (!summaryText) {
            return NextResponse.json({ message: "Could not generate summary" }, { status: 500 });
        }
        
        // Parse the JSON summary
        let parsedSummary;
        try {
            // Import the parseAiResponse helper dynamically
            const parseAiResponse = await import('@/lib/ai-utils').then(module => module.parseAiResponse);
            
            // Parse the summary text to get the structured data
            parsedSummary = parseAiResponse(summaryText);
            
            // Save the original JSON string in metadata (for backward compatibility)
            await prisma.metadata.update({
                where: { content_id: content_id },
                data: { summary: summaryText }
            });
            
            return NextResponse.json({
                message: `Successfully created summary for content_id: ${content_id}`,
                data: parsedSummary
            });
        } catch (parseError) {
            console.error("Error parsing summary JSON:", parseError);
            
            // If JSON parsing fails, save and return as-is (fallback to the old behavior)
            await prisma.metadata.update({
                where: { content_id: content_id },
                data: { summary: summaryText }
            });
            
            return NextResponse.json({
                message: `Successfully created summary for content_id: ${content_id}`,
                data: summaryText
            });
        }
        

    } catch (error) {
        console.error("Error while generating summary: ", error instanceof Error ? error.message : error);
        return NextResponse.json({ message: "Error while generating summary content!" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate user with centralized helper
        const { user, error } = await authenticateUser(req);
        if (error) {
            return error;
        }
        
        const body = await req.json();
        const { text, video_id, content_id } = body;
        if (!content_id) {
            return NextResponse.json({ message: "Please provide content_id!" }, { status: 400 });
        }
        
        // Check if user has access to this content
        const hasAccess = await checkContentAccess(user.user_id, content_id);
        if (!hasAccess) {
            return NextResponse.json({ message: "Content not found or not accessible" }, { status: 403 });
        }
        if (text) {
            // Document lesson: generate summary from text
            const summaryText = await summarizeChunks(text);
            if (!summaryText) {
                return NextResponse.json({ message: "Could not generate summary" }, { status: 500 });
            }
            
            // Parse the JSON summary
            try {
                // Import the parseAiResponse helper dynamically
                const parseAiResponse = await import('@/lib/ai-utils').then(module => module.parseAiResponse);
                
                // Parse the summary text to get the structured data
                const parsedSummary = parseAiResponse(summaryText);
                
                return NextResponse.json({
                    message: `Successfully created summary for content_id: ${content_id} (document lesson)` ,
                    data: parsedSummary
                });
            } catch (parseError) {
                console.error("Error parsing summary JSON:", parseError);
                
                // If JSON parsing fails, return as-is (fallback to the old behavior)
                return NextResponse.json({
                    message: `Successfully created summary for content_id: ${content_id} (document lesson)` ,
                    data: summaryText
                });
            }
        } else if (video_id) {
            // ... existing video logic (copy from GET handler if needed) ...
            // For now, just return an error if not implemented
            return NextResponse.json({ message: "Use GET for video lessons." }, { status: 400 });
        } else {
            return NextResponse.json({ message: "Please provide text or video_id!" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error while generating summary (POST): ", error instanceof Error ? error.message : error);
        return NextResponse.json({ message: "Error while generating summary content!" }, { status: 500 });
    }
}

