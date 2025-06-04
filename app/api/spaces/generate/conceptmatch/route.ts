import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateConceptMatch } from "@/lib/utils";
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

        // First check if we already have metadata with concept match for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        if (existingMetadata?.concept_match) {
            return NextResponse.json({
                message: "Found concept match successfully!",
                data: existingMetadata.concept_match
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

        // Generate concept match with error handling
        let conceptMatch;
        try {
            if (metadataRecord?.concept_match && Object.keys(metadataRecord.concept_match).length > 0) {
                console.log('Using existing concept match from metadata');
                conceptMatch = metadataRecord.concept_match;
            } else {
                console.log('Generating new concept match...');
                const result = await generateConceptMatch(transcriptText);
                
                if (result && result.conceptMatch && Array.isArray(result.conceptMatch)) {
                    conceptMatch = result;
                } else {
                    throw new Error('Invalid concept match format returned');
                }
            }
        } catch (generateError) {
            console.error('Error generating concept match:', generateError);
            
            // Provide a fallback concept match when generation fails
            conceptMatch = {
                conceptMatch: [
                    {
                        id: "1",
                        concept: "Service Unavailable",
                        definition: "The concept match service is temporarily unavailable due to high demand or technical issues."
                    }
                ]
            };
        }
        
        // Save concept match to database
        try {
            const updatedMetadata = await prisma.metadata.update({
                where: { content_id: content_id },
                data: { 
                    concept_match: conceptMatch as any,  // Type assertion to fix TypeScript error
                    updated_at: new Date()
                }
            });

            return NextResponse.json({
                message: "Concept match generated successfully!",
                data: conceptMatch
            }, { status: 200 });

        } catch (saveError) {
            console.error('Error saving concept match to database:', saveError);
            
            // Return the generated concept match even if we couldn't save it
            return NextResponse.json({
                message: "Concept match generated successfully!",
                data: conceptMatch,
                warning: "Could not save to database"
            }, { status: 200 });
        }

    } catch (error) {
        console.error("Concept match generation error:", error);
        return NextResponse.json(
            { message: "Error in generating concept match" },
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

        // First check if we already have metadata with concept match for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        if (existingMetadata?.concept_match) {
            return NextResponse.json(existingMetadata.concept_match, { status: 200 });
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

        // Get content and generate concept match (same logic as GET)
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

        // Generate concept match
        let conceptMatch;
        try {
            console.log('Generating new concept match...');
            const result = await generateConceptMatch(transcriptText);
            
            if (result && result.conceptMatch && Array.isArray(result.conceptMatch)) {
                conceptMatch = result;
            } else {
                throw new Error('Invalid concept match format returned');
            }
        } catch (generateError) {
            console.error('Error generating concept match:', generateError);
            
            conceptMatch = {
                conceptMatch: [
                    {
                        id: "1",
                        concept: "Service Unavailable",
                        definition: "The concept match service is temporarily unavailable due to high demand or technical issues."
                    }
                ]
            };
        }
        
        // Save concept match to database
        try {
            const updatedMetadata = await prisma.metadata.update({
                where: { content_id: content_id },
                data: { 
                    concept_match: conceptMatch as any,  // Type assertion to fix TypeScript error
                    updated_at: new Date()
                }
            });

            return NextResponse.json(conceptMatch, { status: 200 });

        } catch (saveError) {
            console.error('Error saving concept match to database:', saveError);
            return NextResponse.json(conceptMatch, { status: 200 });
        }

    } catch (error) {
        console.error("Concept match generation error:", error);
        return NextResponse.json(
            { message: "Error in generating concept match" },
            { status: 500 }
        );
    }
}
