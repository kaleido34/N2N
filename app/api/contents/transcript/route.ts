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

        // Helper function to normalize transcript format
        const normalizeTranscript = (transcript: any) => {
            // If already an array of objects with text property, return as is
            if (Array.isArray(transcript) && transcript.length > 0 && 
                typeof transcript[0] === 'object' && 'text' in transcript[0]) {
                return transcript;
            }
            
            // If string, convert to array with single object
            if (typeof transcript === 'string') {
                return [{ text: transcript }];
            }
            
            // If object with transcript property
            if (transcript && typeof transcript === 'object' && 'transcript' in transcript) {
                return normalizeTranscript(transcript.transcript);
            }
            
            // If object with content property
            if (transcript && typeof transcript === 'object' && 'content' in transcript) {
                return normalizeTranscript(transcript.content);
            }
            
            // If it's an object but not in the expected format, convert to string and wrap
            if (transcript && typeof transcript === 'object') {
                try {
                    return [{ text: JSON.stringify(transcript) }];
                } catch (e) {
                    return [{ text: "Transcript format could not be processed" }];
                }
            }
            
            // Fallback for unexpected formats
            return [{ text: "No transcript available" }];
        };
        
        // Return transcript based on content type
        if (content.content_type === "YOUTUBE_CONTENT" && content.youtubeContent) {
            return NextResponse.json({
                data: {
                    transcript: normalizeTranscript(content.youtubeContent.transcript),
                    youtube_id: content.youtubeContent.youtube_id,
                    source_type: "youtube"
                }
            });
        } else if (content.content_type === "DOCUMENT_CONTENT" && content.documentContent) {
            return NextResponse.json({
                data: {
                    transcript: normalizeTranscript(content.documentContent.transcript || content.documentContent.text),
                    source_type: "document"
                }
            });
        } else if (content.content_type === "AUDIO_CONTENT" && content.audioContent) {
            return NextResponse.json({
                data: {
                    transcript: normalizeTranscript(content.audioContent.transcript),
                    source_type: "audio"
                }
            });
        } else if (content.content_type === "IMAGE_CONTENT" && content.imageContent) {
            return NextResponse.json({
                data: {
                    transcript: normalizeTranscript(content.imageContent.text),
                    source_type: "image"
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
