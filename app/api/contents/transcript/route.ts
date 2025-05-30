import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
                imageContent: true
            }
        });

        if (!content) {
            return NextResponse.json(
                { message: "Content not found!" },
                { status: 404 }
            );
        }

        // Return transcript based on content type
        if (content.content_type === "YOUTUBE_CONTENT" && content.youtubeContent) {
            return NextResponse.json({
                data: {
                    transcript: content.youtubeContent.transcript,
                    youtube_id: content.youtubeContent.youtube_id
                }
            });
        } else if (content.content_type === "DOCUMENT_CONTENT" && content.documentContent) {
            return NextResponse.json({
                data: {
                    transcript: content.documentContent.transcript
                }
            });
        } else if (content.content_type === "AUDIO_CONTENT" && content.audioContent) {
            return NextResponse.json({
                data: {
                    transcript: content.audioContent.transcript
                }
            });
        } else if (content.content_type === "IMAGE_CONTENT" && content.imageContent) {
            // For image content, we might not have a transcript in the same format,
            // but we can return the extracted text
            return NextResponse.json({
                data: {
                    transcript: [{ text: content.imageContent.text }]
                }
            });
        } else {
            return NextResponse.json(
                { message: "No transcript available for this content type!" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error fetching transcript:", error);
        return NextResponse.json(
            { message: "Error fetching transcript" },
            { status: 500 }
        );
    }
}
