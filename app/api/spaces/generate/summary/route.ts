import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { summarizeChunks } from "@/lib/utils";
import { v4 as uuid } from "uuid";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";

// Import parseAiResponse helper
const aiUtils = import('@/lib/ai-utils').then(module => module.parseAiResponse);

export async function GET(req: NextRequest) {
    try {
        const params = req.nextUrl.searchParams;
        const content_id = params.get("content_id");
        const force = params.get("force") === "true";

        // Authenticate user with centralized helper
        const { user, error } = await authenticateUser(req);
        if (error) {
            return error;
        }

        if (!content_id) {
            return NextResponse.json({ message: "Please provide content_id!" }, { status: 400 });
        }

        // Check if user has access to this content
        const hasAccess = await checkContentAccess(user.user_id, content_id);
        if (!hasAccess) {
            return NextResponse.json({ message: "Content not found or not accessible" }, { status: 403 });
        }

        // First check if we already have metadata with summary for this content
        const existingMetadata = await prisma.metadata.findUnique({
            where: { content_id: content_id }
        });

        // Return existing summary unless force regeneration is requested
        if (existingMetadata?.summary && !force) {
            return NextResponse.json({
                message: "Found summary successfully!",
                data: existingMetadata.summary
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
                // If there's a unique constraint error, the metadata was created by another concurrent request
                // Fetch it instead
                metadataRecord = await prisma.metadata.findUnique({
                    where: { content_id: content_id }
                });
                
                // If still not found, something else went wrong
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
                // Type safe handling of transcript which could be various formats
                if (typeof content.audioContent.transcript === 'object' && 
                    content.audioContent.transcript !== null && 
                    'text' in content.audioContent.transcript) {
                    transcriptText = (content.audioContent.transcript as any).text;
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
        let summaryText;
        try {
            summaryText = await summarizeChunks(transcriptText);
            if (!summaryText) {
                throw new Error('Empty summary text received');
            }
        } catch (error) {
            console.error('Error generating summary:', error);
            // Create a basic fallback without trying to parse anything
            return NextResponse.json({ 
                message: 'Using fallback summary due to generation error',
                data: JSON.stringify({
                    sections: [
                        {
                            type: 'heading',
                            level: 2,
                            content: 'Summary Temporarily Unavailable'
                        },
                        {
                            type: 'paragraph',
                            content: 'We could not generate a summary for this content at this time.'
                        },
                        {
                            type: 'paragraph',
                            content: 'Please try again later when the AI service is less busy.'
                        }
                    ]
                })
            });
        }
        
        // Parse the JSON summary
        let parsedSummary;
        try {
            // First try direct JSON parsing since our fallback is already JSON
            try {
                parsedSummary = JSON.parse(summaryText);
            } catch (jsonError) {
                // If direct parsing fails, try with the AI response parser
                const parseAiResponse = await import('@/lib/ai-utils').then(module => module.parseAiResponse);
                parsedSummary = parseAiResponse(summaryText);
            }
            
            // Validate the structure
            if (!parsedSummary || typeof parsedSummary !== 'object') {
                throw new Error('Invalid summary structure: not an object');
            }
            
            // Ensure sections exist and are properly structured
            if (!parsedSummary.sections) {
                // If it's an array, treat it as sections
                if (Array.isArray(parsedSummary)) {
                    parsedSummary = { 
                        sections: parsedSummary.map(item => {
                            if (typeof item === 'string') {
                                return { type: 'paragraph', content: item };
                            }
                            return item;
                        })
                    };
                } else {
                    // Create default sections if missing
                    parsedSummary = {
                        sections: [
                            {
                                type: 'paragraph',
                                content: 'Summary data could not be properly structured.'
                            }
                        ]
                    };
                }
            }
            
            // Validate each section has at least type and content
            parsedSummary.sections = parsedSummary.sections.map((section: any) => {
                if (!section.type) {
                    section.type = 'paragraph';
                }
                if (!section.content) {
                    section.content = 'Content unavailable';
                }
                return section;
            });
        } catch (parseError) {
            console.error('Error parsing summary:', parseError);
            // Create a simple fallback
            parsedSummary = {
                sections: [
                    {
                        type: 'paragraph',
                        content: 'There was an error processing the summary. Please try again later.'
                    }
                ]
            };
        }
        
        // Ensure sections are in the expected format before saving
        if (!parsedSummary || !parsedSummary.sections || !Array.isArray(parsedSummary.sections)) {
            console.error('Invalid summary data structure before saving:', parsedSummary);
            parsedSummary = {
                sections: [
                    {
                        type: 'paragraph' as const,
                        content: 'The summary data structure was invalid. Please try regenerating the summary.'
                    }
                ]
            };
        }

        // Validate each section to ensure it has the correct structure
        const validatedSections = parsedSummary.sections.map((section: any) => {
            // Ensure type is one of the allowed values
            const validTypes = ['heading', 'paragraph', 'list_item'];
            const type = validTypes.includes(section.type) ? section.type : 'paragraph';
            
            // Ensure content is a string
            const content = typeof section.content === 'string' 
                ? section.content 
                : JSON.stringify(section.content);
                
            // Create a valid section object
            return {
                type,
                level: section.level || undefined,
                content
            };
        });
        
        // Create the final validated summary data
        const validatedSummary = {
            sections: validatedSections
        };
        
        // Save the properly structured JSON in metadata
        await prisma.metadata.update({
            where: { content_id: content_id },
            data: { summary: JSON.stringify(validatedSummary) }
        });
        
        // IMPORTANT: We always want to return the array of sections directly
        // not nested in a 'sections' property
        const sectionsArray = validatedSummary.sections;
        
        // Log what we're returning to help with debugging
        console.log('Returning summary API response with sections:', {
            count: sectionsArray.length,
            firstSection: sectionsArray[0],
            isArray: Array.isArray(sectionsArray)
        });
        
        // Debug log - full sections content for troubleshooting
        console.log('FULL SECTIONS CONTENT:', JSON.stringify(sectionsArray, null, 2));
        
        // Check if there are any complex objects that might not stringify well
        sectionsArray.forEach((section: any, i: number) => {
            console.log(`Section ${i} type:`, typeof section.content);
            if (typeof section.content !== 'string') {
                console.log(`Section ${i} has non-string content:`, section.content);
                // Force it to be a string
                section.content = String(section.content);
            }
        });
        
        return NextResponse.json({
            message: `Successfully created summary for content_id: ${content_id}`,
            data: sectionsArray
        });
        

    } catch (error) {
        console.error("Error while generating summary: ", error instanceof Error ? error.message : error);
        return NextResponse.json({ message: "Error while generating summary content!" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate user with centralized helper
        const { user, error } = await authenticateUser(req);
        if (error) {
            return error;
        }
        
        const body = await req.json();
        const { text, video_id, content_id } = body;
        if (!content_id) {
            return NextResponse.json({ message: "Please provide content_id!" }, { status: 400 });
        }
        
        // Check if user has access to this content
        const hasAccess = await checkContentAccess(user.user_id, content_id);
        if (!hasAccess) {
            return NextResponse.json({ message: "Content not found or not accessible" }, { status: 403 });
        }
        if (text) {
            // Document lesson: generate summary from text
            const summaryText = await summarizeChunks(text);
            if (!summaryText) {
                return NextResponse.json({ message: "Could not generate summary" }, { status: 500 });
            }
            
            // Parse the JSON summary
            try {
                // Import the parseAiResponse helper dynamically
                const parseAiResponse = await import('@/lib/ai-utils').then(module => module.parseAiResponse);
                
                // Parse the summary text to get the structured data
                const parsedSummary = parseAiResponse(summaryText);
                
                return NextResponse.json({
                    message: `Successfully created summary for content_id: ${content_id} (document lesson)` ,
                    data: parsedSummary
                });
            } catch (parseError) {
                console.error("Error parsing summary JSON:", parseError);
                
                // If JSON parsing fails, return as-is (fallback to the old behavior)
                return NextResponse.json({
                    message: `Successfully created summary for content_id: ${content_id} (document lesson)` ,
                    data: summaryText
                });
            }
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

