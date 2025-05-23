import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateMindMap } from "@/lib/utils";
import { verifyJwtToken } from "@/lib/jwt"; // ✅ Import verifier

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        const video_id = params.get("video_id");
        const content_id = params.get("content_id");

        // ✅ Securely extract and verify token
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

        if (!video_id || !content_id) {
            return NextResponse.json(
                { message: "Please provide video_id and content_id!" },
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

        const existingMetadata = await prisma.metadata.findUnique({
            where: {
                youtube_id: video_id
            }
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

        if (!existingMetadata?.mindmap) {
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

            const transcripts = (youtubeData.transcript as { text: string, startTime: string, endTime: string }[])
                .map(chunk => chunk.text);
            const fullTranscript = transcripts.join(" ");

            const mindMap = await generateMindMap(fullTranscript);
            if (!mindMap) {
                return NextResponse.json(
                    { message: "Could not generate mindMap!" },
                    { status: 500 }
                );
            }

            const cleanedMindMap = mindMap.replace(/```json\n|```/g, '');
            const mindMapJson = JSON.parse(cleanedMindMap);

            await prisma.metadata.update({
                where: { youtube_id: video_id },
                data: { mindmap: mindMapJson }
            });

            return NextResponse.json(
                {
                    message: "mindMaps generated Successfully!",
                    data: mindMapJson
                },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                {
                    message: "Found mindmaps Successfully!",
                    data: existingMetadata.mindmap
                },
                { status: 200 }
            );
        }
    } catch (error) {
        console.error("Error while generating mindmap: ", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { message: "Error while generating mindmap content!" },
            { status: 500 }
        );
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
            const mindmap = await generateMindMap(text);
            if (!mindmap) return NextResponse.json({ message: "Could not generate mindmap" }, { status: 500 });
            return NextResponse.json({ message: "Success", data: mindmap });
        } else if (video_id) {
            return NextResponse.json({ message: "Use GET for video lessons." }, { status: 400 });
        } else {
            return NextResponse.json({ message: "Please provide text or video_id!" }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ message: "Error while generating mindmap!" }, { status: 500 });
    }
}
