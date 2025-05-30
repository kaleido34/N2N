import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateMindMap } from "@/lib/utils";
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

        // Get content with its type-specific data
        const content = await prisma.content.findUnique({
            where: { content_id: content_id },
            include: {
                youtubeContent: true,
                documentContent: true,
                audioContent: true,
                imageContent: true,
                metadata: true
            }
        });

        if (!content) {
            return NextResponse.json(
                { message: "Content not found!" },
                { status: 404 }
            );
        }

        // Check if mindmap already exists in metadata
        if (content.metadata?.mindmap) {
            return NextResponse.json({
                data: content.metadata.mindmap
            });
        }

        // If not, generate mindmap based on content type
        let fullTranscript = "";

        if (content.content_type === "YOUTUBE_CONTENT" && content.youtubeContent) {
            // For YouTube content, use transcript
            const transcript = content.youtubeContent.transcript;
            if (Array.isArray(transcript)) {
                fullTranscript = transcript.map((item: any) => item.text).join(" ");
            }
        } else if (content.content_type === "DOCUMENT_CONTENT" && content.documentContent) {
            // For document content, use text
            fullTranscript = content.documentContent.text || "";
        } else if (content.content_type === "AUDIO_CONTENT" && content.audioContent) {
            // For audio content, use transcript text
            const transcript = content.audioContent.transcript;
            if (transcript && transcript.text) {
                fullTranscript = transcript.text;
            }
        } else if (content.content_type === "IMAGE_CONTENT" && content.imageContent) {
            // For image content, use extracted text
            fullTranscript = content.imageContent.text || "";
        }

        if (!fullTranscript) {
            return NextResponse.json(
                { message: "No text content available to generate mindmap!" },
                { status: 404 }
            );
        }

        // Generate mindmap
        const mindMap = await generateMindMap(fullTranscript);
        const mindMapData = JSON.parse(mindMap);

        // Save mindmap to metadata
        await prisma.metadata.upsert({
            where: { content_id: content_id },
            update: { mindmap: mindMapData },
            create: {
                content_id: content_id,
                mindmap: mindMapData,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            data: mindMapData
        });
    } catch (error) {
        console.error("Error generating mindmap:", error);
        return NextResponse.json(
            { message: "Error generating mindmap" },
            { status: 500 }
        );
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

        if (text) {
            const mindmap = await generateMindMap(text);
            if (!mindmap) {
                return NextResponse.json(
                    { message: "Could not generate mindmap" },
                    { status: 500 }
                );
            }
            
            const cleanedMindMap = mindmap.replace(/```json\n|```/g, '');
            let mindmapJson;
            
            try {
                mindmapJson = JSON.parse(cleanedMindMap);
            } catch (parseError) {
                console.error("Error parsing mindmap JSON:", parseError);
                return NextResponse.json(
                    { message: "Invalid mindmap format!" },
                    { status: 500 }
                );
            }

            // Store mindmap in metadata
            await prisma.metadata.upsert({
                where: { content_id },
                update: { mindmap: mindmapJson },
                create: {
                    content_id,
                    mindmap: mindmapJson,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });

            return NextResponse.json({
                message: "Mindmap generated successfully",
                data: mindmapJson
            });
        } else if (video_id) {
            return NextResponse.json(
                { message: "Use GET for video lessons." },
                { status: 400 }
            );
        } else {
            return NextResponse.json(
                { message: "Please provide text or video_id!" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error in mindmap generation:", error);
        return NextResponse.json(
            { message: "Error while generating mindmap!" },
            { status: 500 }
        );
    }
}

