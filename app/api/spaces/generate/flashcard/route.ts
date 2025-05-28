import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFlashCards } from "@/lib/utils";
import { v4 as uuid } from "uuid";
import { verifyJwtToken } from "@/lib/jwt"; // ✅ Import the verifier

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        const video_id = params.get("video_id");
        const content_id = params.get("content_id");

        let token = req.headers.get("authorization");
        if (!token) {
            return NextResponse.json(
                { message: "Missing authorization token." },
                { status: 401 }
            );
        }
        if (token.startsWith("Bearer ")) token = token.slice(7);
        const user = await verifyJwtToken(token, process.env.JWT_SECRET!);
        if (!user || !user.user_id) {
            return NextResponse.json(
                { message: "Invalid or expired token." },
                { status: 403 }
            );
        }

        if (!content_id) {
            return NextResponse.json(
                { message: "Please provide content_id!" },
                { status: 403 }
            );
        }

        // ✅ Check if user has access to content
        const userContentExist = await prisma.userContent.findUnique({
            where: {
                user_id_content_id: {
                    user_id: user.user_id,
                    content_id: content_id
                }
            }
        });

        if (!userContentExist) {
            return NextResponse.json(
                { message: "Content not found for the user!" },
                { status: 401 }
            );
        }

        if (video_id) {
            const existingMetadata = await prisma.metadata.findUnique({
                where: { youtube_id: video_id }
            });

            if (!existingMetadata) {
                await prisma.metadata.create({
                    data: {
                        metadata_id: uuid(),
                        youtube_id: video_id,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
            }

            if (!existingMetadata?.flashcards) {
                const youtubeData = await prisma.youtubeContent.findUnique({
                    where: {
                        content_id: content_id,
                        youtube_id: video_id
                    }
                });

                if (!youtubeData?.transcript) {
                    return NextResponse.json(
                        { message: "No transcript found for this video" },
                        { status: 404 }
                    );
                }

                const transcripts = (youtubeData.transcript as { text: string, startTime: string, endTime: string }[]).map(chunk => chunk.text);
                const fullTranscript = transcripts.join(" ");

                const flashcards = await generateFlashCards(fullTranscript);
                if (!flashcards) {
                    return NextResponse.json(
                        { message: "Could not generate flashcards!" },
                        { status: 500 }
                    );
                }

                const cleanedFlashcards = flashcards.replace(/```json\n|```/g, '');
                let flashcardsJson;
                try {
                    flashcardsJson = JSON.parse(cleanedFlashcards);
                } catch (parseError) {
                    return NextResponse.json({ message: "Invalid flashcards format!" }, { status: 500 });
                }

                await prisma.metadata.update({
                    where: { youtube_id: video_id },
                    data: { flashcards: flashcardsJson }
                });

                return NextResponse.json(
                    {
                        message: "flashcards generated Successfully!",
                        data: flashcardsJson
                    },
                    { status: 200 }
                );
            } else {
                return NextResponse.json(
                    {
                        message: "Found flashcards Successfully!",
                        data: existingMetadata.flashcards
                    },
                    { status: 200 }
                );
            }
        } else {
            // Document lesson logic
            const documentContent = await prisma.documentContent.findUnique({
                where: { content_id: content_id },
                select: { flashcards: true }
            });
            if (!documentContent || !documentContent.flashcards) {
                return NextResponse.json({ message: "No flashcards found for this document lesson" }, { status: 404 });
            }
            return NextResponse.json({
                message: "Found flashcards Successfully!",
                data: documentContent.flashcards
            }, { status: 200 });
        }
    } catch (error) {
        return NextResponse.json({ message: "Error while generating flashcards content!" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        let token = req.headers.get("authorization");
        if (!token) return NextResponse.json({ message: "Missing authorization token." }, { status: 401 });
        if (token.startsWith("Bearer ")) token = token.slice(7);
        const user = await verifyJwtToken(token, process.env.JWT_SECRET!);
        if (!user || !user.user_id) return NextResponse.json({ message: "Invalid or expired token." }, { status: 403 });

        const body = await req.json();
        const { text, video_id, content_id } = body;
        if (!content_id) return NextResponse.json({ message: "Please provide content_id!" }, { status: 403 });

        const userContentExist = await prisma.userContent.findUnique({
            where: { user_id_content_id: { user_id: user.user_id, content_id } }
        });
        if (!userContentExist) return NextResponse.json({ message: "Content not found for the user!" }, { status: 401 });

        if (text) {
            const flashcards = await generateFlashCards(text);
            if (!flashcards) return NextResponse.json({ message: "Could not generate flashcards" }, { status: 500 });
            const cleanedFlashcards = flashcards.replace(/```json\n|```/g, '');
            let flashcardsJson;
            try {
                flashcardsJson = JSON.parse(cleanedFlashcards);
            } catch (parseError) {
                return NextResponse.json({ message: "Invalid flashcards format!" }, { status: 500 });
            }
            // Store flashcards in DocumentContent
            await prisma.documentContent.update({
                where: { content_id: content_id },
                data: { flashcards: flashcardsJson }
            });
            return NextResponse.json({ message: `Successfully created flashcards for content_id: ${content_id} (document lesson)`, data: flashcardsJson });
        } else if (video_id) {
            return NextResponse.json({ message: "Use GET for video lessons." }, { status: 400 });
        } else {
            return NextResponse.json({ message: "Please provide text or video_id!" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error while generating flashcards (POST): ", error instanceof Error ? error.message : error);
        return NextResponse.json({ message: "Error while generating flashcards content!" }, { status: 500 });
    }
}
