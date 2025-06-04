import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateTermBuilder } from "@/lib/utils";
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

        // First check if we already have metadata with term builder for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        if (existingMetadata?.term_builder) {
            return NextResponse.json({
                message: "Found term builder successfully!",
                data: existingMetadata.term_builder
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
                metadataRecord = await prisma.metadata.findUnique({
                    where: { content_id: content_id }
                });
                
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

        // Generate term builder with error handling
        let termBuilder;
        try {
            if (metadataRecord?.term_builder && Object.keys(metadataRecord.term_builder).length > 0) {
                console.log('Using existing term builder from metadata');
                termBuilder = metadataRecord.term_builder;
            } else {
                console.log('Generating new term builder...');
                const result = await generateTermBuilder(transcriptText);
                
                if (result && result.termBuilder && Array.isArray(result.termBuilder)) {
                    termBuilder = result;
                } else {
                    throw new Error('Invalid term builder format returned');
                }
            }
        } catch (generateError) {
            console.error('Error generating term builder:', generateError);
            
            // Provide a fallback term builder when generation fails
            termBuilder = {
                termBuilder: [
                    {
                        id: "1",
                        title: "Service Unavailable",
                        description: "Build a chain using the available terms",
                        correctChain: ["Service", "Unavailable"],
                        availableTerms: ["Service", "Unavailable", "Error", "Issue"],
                        difficulty: "easy"
                    }
                ]
            };
        }
        
        // Save term builder to database
        try {
            const updatedMetadata = await prisma.metadata.update({
                where: { content_id: content_id },
                data: { 
                    term_builder: termBuilder,
                    updated_at: new Date()
                }
            });

            return NextResponse.json({
                message: "Term builder generated successfully!",
                data: termBuilder
            }, { status: 200 });

        } catch (saveError) {
            console.error('Error saving term builder to database:', saveError);
            
            // Return the generated term builder even if we couldn't save it
            return NextResponse.json({
                message: "Term builder generated successfully!",
                data: termBuilder,
                warning: "Could not save to database"
            }, { status: 200 });
        }

    } catch (error) {
        console.error("Term builder generation error:", error);
        return NextResponse.json(
            { message: "Error in generating term builder" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    let content_id: string | null = null;
    
    try {
        const body = await req.json();
        content_id = body.content_id;

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

        // First check if we already have metadata with term builder for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        if (existingMetadata?.term_builder) {
            return NextResponse.json(existingMetadata.term_builder, { status: 200 });
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
                metadataRecord = await prisma.metadata.findUnique({
                    where: { content_id: content_id }
                });
                
                if (!metadataRecord) {
                    throw createError;
                }
            }
        }

        // Get content and generate term builder (same logic as GET)
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

        // Get transcript based on content type (same logic as GET)
        switch (content.content_type) {
            case "YOUTUBE_CONTENT":
                if (!content.youtubeContent?.transcript) {
                    return NextResponse.json({ message: "No transcript found for this video" }, { status: 404 });
                }
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

        // Generate term builder
        let termBuilder;
        try {
            console.log('Generating new term builder...');
            const result = await generateTermBuilder(transcriptText);
            
            if (result && result.termBuilder && Array.isArray(result.termBuilder)) {
                termBuilder = result;
            } else {
                throw new Error('Invalid term builder format returned');
            }
        } catch (generateError) {
            console.error('Error generating term builder:', generateError);
            
            termBuilder = {
                termBuilder: [
                    {
                        id: "1",
                        title: "Service Unavailable",
                        description: "Build a chain using the available terms",
                        correctChain: ["Service", "Unavailable"],
                        availableTerms: ["Service", "Unavailable", "Error", "Issue"],
                        difficulty: "easy"
                    }
                ]
            };
        }
        
        // Save term builder to database
        try {
            const updatedMetadata = await prisma.metadata.update({
                where: { content_id: content_id },
                data: { 
                    term_builder: termBuilder,
                    updated_at: new Date()
                }
            });

            return NextResponse.json(termBuilder, { status: 200 });

        } catch (saveError) {
            console.error('Error saving term builder to database:', saveError);
            return NextResponse.json(termBuilder, { status: 200 });
        }

    } catch (error) {
        console.error("Term builder generation error:", error);
        return NextResponse.json(
            { message: "Error in generating term builder" },
            { status: 500 }
        );
    }
}
