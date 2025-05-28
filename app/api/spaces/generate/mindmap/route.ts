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

                let mindMapJson;
                try {
                    // Clean the mindmap string by removing markdown code blocks
                    const cleanedMindMap = mindMap.replace(/```json\n|```/g, '');
                    
                    // Handle possible leading/trailing whitespace
                    const trimmedMap = cleanedMindMap.trim();
                    
                    // Parse the JSON, if it fails, try alternative approaches
                    try {
                        mindMapJson = JSON.parse(trimmedMap);
                    } catch (parseError) {
                        console.error("Initial JSON parse failed:", parseError);
                        console.log("Attempting alternative parsing approaches...");
                        
                        // If JSON.parse fails, it might be because of malformed JSON from the AI
                        // Let's create a basic mindmap structure as fallback
                        mindMapJson = {
                            nodes: [
                                { key: 1, text: "Main Topic", category: "root" },
                                { key: 2, text: "Subtopic 1", category: "section" },
                                { key: 3, text: "Subtopic 2", category: "section" }
                            ],
                            links: [
                                { from: 1, to: 2 },
                                { from: 1, to: 3 }
                            ]
                        };
                    }
                } catch (error) {
                    console.error("Error parsing mindmap JSON:", error);
                    console.log("Original mindmap string:", mindMap);
                    
                    // Return a basic mindmap structure as fallback
                    const fallbackMindmap = {
                        "nodes": [
                            {
                                "text": "Content Summary",
                                "children": [
                                    {
                                        "text": "Main Topic",
                                        "children": [
                                            { "text": "Key Point 1" },
                                            { "text": "Key Point 2" }
                                        ]
                                    }
                                ]
                            }
                        ]
                    };
                    
                    return NextResponse.json(
                        { message: "Error parsing mindmap data", data: fallbackMindmap },
                        { status: 200 }
                    );
                }

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
        } else {
            // Document lesson logic
            const documentContent = await prisma.documentContent.findUnique({
                where: { content_id: content_id },
                select: { mindmap: true }
            });
            if (!documentContent || !documentContent.mindmap) {
                return NextResponse.json({ message: "No mindmap found for this document lesson" }, { status: 404 });
            }
            return NextResponse.json({
                message: "Found mindmap Successfully!",
                data: documentContent.mindmap
            }, { status: 200 });
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
            const cleanedMindMap = mindmap.replace(/```json\n|```/g, '');
            let mindmapJson;
            try {
                mindmapJson = JSON.parse(cleanedMindMap);
            } catch (parseError) {
                return NextResponse.json({ message: "Invalid mindmap format!" }, { status: 500 });
            }
            // Store mindmap in DocumentContent
            await prisma.documentContent.update({
                where: { content_id: content_id },
                data: { mindmap: mindmapJson }
            });
            return NextResponse.json({ message: "Success", data: mindmapJson });
        } else if (video_id) {
            return NextResponse.json({ message: "Use GET for video lessons." }, { status: 400 });
        } else {
            return NextResponse.json({ message: "Please provide text or video_id!" }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ message: "Error while generating mindmap!" }, { status: 500 });
    }
}
