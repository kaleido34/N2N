import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFlashCards } from "@/lib/utils";
import { v4 as uuid } from "uuid";
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

        // Check if flashcards already exist in metadata
        if (content.metadata?.flashcards) {
            return NextResponse.json({
                data: content.metadata.flashcards
            });
        }

        // If not, generate flashcards based on content type
        let fullText = "";

        if (content.content_type === "YOUTUBE_CONTENT" && content.youtubeContent) {
            // For YouTube content, use transcript
            const transcript = content.youtubeContent.transcript;
            if (Array.isArray(transcript)) {
                fullText = transcript.map(item => item.text).join(" ");
            }
        } else if (content.content_type === "DOCUMENT_CONTENT" && content.documentContent) {
            // For document content, use text
            fullText = content.documentContent.text || "";
        } else if (content.content_type === "AUDIO_CONTENT" && content.audioContent) {
            // For audio content, use transcript text
            const transcript = content.audioContent.transcript;
            if (transcript && transcript.text) {
                fullText = transcript.text;
            }
        } else if (content.content_type === "IMAGE_CONTENT" && content.imageContent) {
            // For image content, use extracted text
            fullText = content.imageContent.text || "";
        }

        if (!fullText) {
            return NextResponse.json(
                { message: "No text content available to generate flashcards!" },
                { status: 404 }
            );
        }

        // Generate flashcards
        const flashcardsData = await generateFlashCards(fullText);
        const flashcards = JSON.parse(flashcardsData);

        // Save flashcards to metadata
        await prisma.metadata.upsert({
            where: { content_id: content_id },
            update: { flashcards: flashcards },
            create: {
                content_id: content_id,
                flashcards: flashcards,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            data: flashcards
        });
    } catch (error) {
        console.error("Error generating flashcards:", error);
        return NextResponse.json(
            { message: "Error generating flashcards" },
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
        const { content_id, flashcards } = body;

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
        
        // Save flashcards to metadata
        await prisma.metadata.upsert({
            where: { content_id: content_id },
            update: { flashcards: flashcards },
            create: {
                content_id: content_id,
                flashcards: flashcards,
                created_at: new Date(),
                updated_at: new Date()
            }
        });
        
        return NextResponse.json({
            message: "Flashcards saved successfully",
            data: flashcards
        });
    } catch (error) {
        console.error("Error saving flashcards:", error);
        return NextResponse.json(
            { message: "Error saving flashcards" },
            { status: 500 }
        );
    }
}
