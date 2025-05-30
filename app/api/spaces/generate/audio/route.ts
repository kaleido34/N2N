import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";
const googleTTS = require('google-tts-api');

// Maximum text length for Google TTS in a single request
const MAX_TEXT_LENGTH = 200;

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

    // Check if audio summary already exists in metadata
    const existingMetadata = await prisma.metadata.findUnique({
      where: { content_id: content_id }
    });

    // If audio summary URL already exists, return it
    if (existingMetadata?.audio_summary) {
      return NextResponse.json({
        message: "Audio summary found",
        data: {
          audioUrl: existingMetadata.audio_summary,
          summaryText: existingMetadata.summary || "Summary not available"
        }
      }, { status: 200 });
    }

    // Get the content summary from unified metadata
    let summaryText = "";
    
    // Check metadata for summary
    if (existingMetadata?.summary) {
      try {
        // Try to parse as JSON first
        const parsedSummary = JSON.parse(existingMetadata.summary);
        if (Array.isArray(parsedSummary)) {
          summaryText = parsedSummary.join(' ');
        } else {
          summaryText = parsedSummary.toString();
        }
      } catch (e) {
        // If not JSON, use as is
        summaryText = existingMetadata.summary;
      }
    }
    
    // If no summary in metadata, get title from content based on content type
    if (!summaryText) {
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

      // Get title based on content type
      switch (content.content_type) {
        case "YOUTUBE_CONTENT":
          if (content.youtubeContent?.title) {
            summaryText = `Summary of ${content.youtubeContent.title}`;
          }
          break;
          
        case "DOCUMENT_CONTENT":
          if (content.documentContent?.filename) {
            summaryText = `Summary of document ${content.documentContent.filename}`;
          }
          break;
          
        case "AUDIO_CONTENT":
          if (content.audioContent?.title) {
            summaryText = `Summary of audio ${content.audioContent.title}`;
          }
          break;
          
        case "IMAGE_CONTENT":
          if (content.imageContent?.title) {
            summaryText = `Summary of image ${content.imageContent.title}`;
          }
          break;
          
        default:
          summaryText = `Summary of content ${content_id}`;
      }
    }

    if (!summaryText) {
      return NextResponse.json({ message: "No summary available for audio generation" }, { status: 404 });
    }

    // Truncate text if needed
    summaryText = summaryText.substring(0, MAX_TEXT_LENGTH);

    try {
      // Generate TTS URL
      const audioUrl = await googleTTS(summaryText, 'en', 1);
      
      // Store the audio URL in metadata
      if (existingMetadata) {
        await prisma.metadata.update({
          where: { content_id: content_id },
          data: { audio_summary: audioUrl }
        });
      } else {
        await prisma.metadata.create({
          data: {
            content_id: content_id,
            audio_summary: audioUrl,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      
      // Return the audio URL and summary text
      return NextResponse.json({
        message: "Audio generated successfully",
        data: {
          audioUrl: audioUrl,
          summaryText: summaryText
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
    } catch (ttsError) {
      console.error("Error generating audio:", ttsError);
      return NextResponse.json({ 
        message: "Failed to generate audio", 
        error: String(ttsError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in audio generation endpoint:", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user
    const { user, error } = await authenticateUser(req);
    if (error) return error;

    // Parse request body
    const body = await req.json();
    const { text, content_id } = body;

    // Input validation
    if (!content_id) {
      return NextResponse.json(
        { message: "Please provide content_id!" },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { message: "No text provided for audio generation" },
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

    // Check if metadata exists
    const existingMetadata = await prisma.metadata.findUnique({
      where: { content_id }
    });

    // Truncate text if needed
    const processedText = text.substring(0, MAX_TEXT_LENGTH);

    // Generate TTS URL
    const audioUrl = await googleTTS(processedText, 'en', 1);
    
    // Store the audio URL in metadata using upsert
    await prisma.metadata.upsert({
      where: { content_id },
      update: { 
        audio_summary: audioUrl,
        updated_at: new Date()
      },
      create: {
        content_id,
        audio_summary: audioUrl,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Return the audio URL and processed text
    return NextResponse.json({
      message: "Audio generated successfully",
      data: {
        audioUrl: audioUrl,
        summaryText: processedText
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Error in audio generation endpoint:", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

