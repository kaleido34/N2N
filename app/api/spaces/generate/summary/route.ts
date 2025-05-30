import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { summarizeChunks } from "@/lib/utils";
import { v4 as uuid } from "uuid";
import { verifyJwtToken } from "@/lib/jwt"; // ✅ Import verifier

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        const content_id = params.get("content_id");

        let token = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!token) {
            return NextResponse.json({ message: "Missing authorization token." }, { status: 401 });
        }
        if (token.startsWith("Bearer ")) token = token.slice(7);
        const user = await verifyJwtToken(token, process.env.JWT_SECRET!);
        if (!user || !user.user_id) {
            return NextResponse.json({ message: "Invalid or expired token." }, { status: 403 });
        }

        if (!content_id) {
            return NextResponse.json({ message: "Please provide content_id!" }, { status: 403 });
        }

        const userContentExist = await prisma.userContent.findUnique({
            where: {
                user_id_content_id: {
                    user_id: user.user_id,
                    content_id: content_id
                }
            }
        });

        if (!userContentExist) {
            return NextResponse.json({ message: "Content not found for the user!" }, { status: 401 });
        }

        // First check if we already have metadata with summary for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        if (existingMetadata?.summary) {
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
                if (typeof content.audioContent.transcript === 'object' && content.audioContent.transcript.text) {
                    transcriptText = content.audioContent.transcript.text;
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
        const summary = await summarizeChunks(transcriptText);
        if (!summary) {
            return NextResponse.json({ message: "Could not generate summary" }, { status: 500 });
        }

        // Save the summary in metadata
        await prisma.metadata.update({
            where: { content_id: content_id },
            data: { summary }
        });

        return NextResponse.json({
            message: `Successfully created summary for content_id: ${content_id}`,
            data: summary
        });
        

    } catch (error) {
        console.error("Error while generating summary: ", error instanceof Error ? error.message : error);
        return NextResponse.json({ message: "Error while generating summary content!" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        let token = req.headers.get("authorization") || req.headers.get("Authorization");
        if (!token) {
            return NextResponse.json({ message: "Missing authorization token." }, { status: 401 });
        }
        if (token.startsWith("Bearer ")) token = token.slice(7);
        const user = await verifyJwtToken(token, process.env.JWT_SECRET!);
        if (!user || !user.user_id) {
            return NextResponse.json({ message: "Invalid or expired token." }, { status: 403 });
        }
        const body = await req.json();
        const { text, video_id, content_id } = body;
        if (!content_id) {
            return NextResponse.json({ message: "Please provide content_id!" }, { status: 403 });
        }
        // Check user-content relation
        const userContentExist = await prisma.userContent.findUnique({
            where: {
                user_id_content_id: {
                    user_id: user.user_id,
                    content_id: content_id
                }
            }
        });
        if (!userContentExist) {
            return NextResponse.json({ message: "Content not found for the user!" }, { status: 401 });
        }
        if (text) {
            // Document lesson: generate summary from text
            const summary = await summarizeChunks(text);
            if (!summary) {
                return NextResponse.json({ message: "Could not generate summary" }, { status: 500 });
            }
            return NextResponse.json({
                message: `Successfully created summary for content_id: ${content_id} (document lesson)` ,
                data: summary
            });
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

