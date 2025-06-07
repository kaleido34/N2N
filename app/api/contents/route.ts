import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { authenticateUser } from "@/lib/auth-helpers";

// Import only what you need - remove embedding-related imports
import { fetchTranscripts, preprocessTranscript, transcriptInterface } from "@/lib/utils";

// Summary processing function to ensure consistent format across all content types
const processSummaryData = (rawSummary: any): any[] => {
  if (!rawSummary) {
    return [];
  }

  // If it's already an array of sections, validate and return
  if (Array.isArray(rawSummary)) {
    return rawSummary.map((item: any) => {
      if (typeof item === 'object' && item !== null && item.type && item.content) {
        return {
          type: item.type || 'paragraph',
          level: item.level,
          content: String(item.content || '')
        };
      }
      // If it's a string in the array
      return { type: 'paragraph' as const, content: String(item) };
    });
  }

  // If it's a string, try to parse it
  if (typeof rawSummary === 'string') {
    const trimmed = rawSummary.trim();
    
    // Try JSON parsing first
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        
        // Check if parsed has sections property
        if (parsed && typeof parsed === 'object' && parsed.sections && Array.isArray(parsed.sections)) {
          return parsed.sections.map((section: any) => ({
            type: section.type || 'paragraph',
            level: section.level,
            content: String(section.content || section.text || '')
          }));
        }
        
        // If it's an array directly
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            type: item.type || 'paragraph',
            level: item.level,
            content: String(item.content || item.text || item)
          }));
        }

        // If it's a single object
        return [{ 
          type: 'paragraph' as const, 
          content: String(parsed.content || parsed.text || parsed.summary || JSON.stringify(parsed))
        }];
        
      } catch (parseError) {
        console.warn('Failed to parse summary JSON, treating as plain text:', parseError);
      }
    }
    
    // Not JSON or JSON parse failed, treat as plain text
    return [
      { type: 'heading' as const, level: 2, content: 'Summary' },
      { type: 'paragraph' as const, content: trimmed }
    ];
  }

  // If it's an object (but not array)
  if (typeof rawSummary === 'object' && rawSummary !== null) {
    // Check if it has sections property
    if (rawSummary.sections && Array.isArray(rawSummary.sections)) {
      return rawSummary.sections.map((section: any) => ({
        type: section.type || 'paragraph',
        level: section.level,
        content: String(section.content || section.text || '')
      }));
    }
    
    // Single object, extract content
    const content = rawSummary.content || rawSummary.summary || rawSummary.text || JSON.stringify(rawSummary);
    return [
      { type: 'heading' as const, level: 2, content: 'Summary' },
      { type: 'paragraph' as const, content: String(content) }
    ];
  }

  // Fallback for any other type
  return [
    { type: 'heading' as const, level: 2, content: 'Summary' },
    { type: 'paragraph' as const, content: String(rawSummary) }
  ];
};

// --------------------------------------
// Helper function to extract YouTube ID
// --------------------------------------
function extractYoutubeId(url: string): string | null {
  try {
    // Attempt to handle basic patterns:
    const u = new URL(url);
    const paramV = u.searchParams.get("v");
    if (paramV) {
      return paramV;
    }
    // e.g., handle youtu.be/xxxx
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // ----------------------------------------------------------------------
    // 1) Authenticate user with centralized helper
    // ----------------------------------------------------------------------
    const { user, error } = await authenticateUser(req);
    if (error) {
      return error;
    }
    
    const userId = user.user_id;

    // ----------------------------------------------------------------------
    // 2) Parse request body: { youtube_url, space_id }
    // ----------------------------------------------------------------------
    const body = await req.json();
    const youtube_url: string | undefined = body.youtube_url;
    let spaceId: string | undefined = body.space_id;

    if (!youtube_url) {
      return NextResponse.json(
        { error: "youtube_url is required" },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------------------
    // 3) If no space_id, find or create a "Personal Workspace" for this user
    // ----------------------------------------------------------------------
    if (!spaceId) {
      // Always create a personal workspace if we don't have a space_id
      // First try to find an existing one with case-insensitive search
      let defaultSpace = await prisma.space.findFirst({
        where: {
          user_id: userId,
          OR: [
            { space_name: "Personal Workspace" },
            { space_name: { contains: "personal", mode: "insensitive" } },
            { space_name: { contains: "workspace", mode: "insensitive" } }
          ]
        },
      });

      // If no personal workspace exists, create one
      if (!defaultSpace) {
        console.log("Creating new Personal Workspace for user:", userId);
        defaultSpace = await prisma.space.create({
          data: {
            user_id: userId,
            space_name: "Personal Workspace",
          },
        });
      } else {
        console.log("Found existing Personal Workspace:", defaultSpace.space_id);
      }
      
      spaceId = defaultSpace.space_id;
    }

    // ----------------------------------------------------------------------
    // 4) Determine the YouTube video ID & fetch transcripts
    // ----------------------------------------------------------------------
    const videoId = extractYoutubeId(youtube_url);
    if (!videoId) {
      return NextResponse.json(
        { error: "Could not extract valid video ID from youtube_url" },
        { status: 400 }
      );
    }

    // Fetch transcripts from your existing utility
    let transcript: transcriptInterface[] | null;
    try {
      transcript = await fetchTranscripts(videoId);
      if (!transcript || transcript.length === 0) {
        console.log('No transcript available for video:', videoId);
        return NextResponse.json(
          { 
            error: "NO_TRANSCRIPT",
            message: "This video doesn't have any transcript available. Transcripts may be disabled by the video owner."
          },
          { status: 200 } // Using 200 to prevent showing as error in UI
        );
      }
    } catch (error) {
      console.error('Error fetching transcript for video:', videoId, 'Error:', error);
      return NextResponse.json(
        { 
          error: "TRANSCRIPT_ERROR",
          message: "Unable to fetch transcript for this video. Transcripts may be disabled or not available."
        },
        { status: 200 } // Using 200 to prevent showing as error in UI
      );
    }

    // ----------------------------------------------------------------------
    // 5) Fetch YouTube metadata (title, description, thumbnail, etc.)
    // ----------------------------------------------------------------------
    const metadataResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_APIKEY}`
    );
    const metadata = metadataResponse.data as { items: { snippet: { title: string; description: string; thumbnails: { standard: { url: string } } } }[] };
    if (!metadata.items || metadata.items.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch YouTube video metadata" },
        { status: 404 }
      );
    }
    const snippet = metadata.items[0].snippet || {};
    const videoTitle = snippet.title || "Untitled";
    const videoDescription = snippet.description || "";
    const videoThumbnail = snippet?.thumbnails?.standard?.url || "";

    // ----------------------------------------------------------------------
    // 6) Check if we already have a YoutubeContent for this videoId
    //    => If yes, reuse that content_id
    // ----------------------------------------------------------------------
    const existingYoutubeContent = await prisma.youtubeContent.findUnique({
      where: { youtube_id: videoId },
      include: {
        content: true, // So we can see the parent Content row
      },
    });

    // We'll store the final content_id here
    let contentId: string;

    // Processed transcript chunks (for embedding)
    const processedTranscriptChunks = await preprocessTranscript(transcript);

    // ----------------------------------------------------------------------
    // 7) If existing, reuse the content_id. Otherwise, create new.
    // ----------------------------------------------------------------------
    if (existingYoutubeContent) {
      contentId = existingYoutubeContent.content_id;

      // Check if this user already has a user->content record
      const userContentRecord = await prisma.userContent.findUnique({
        where: {
          user_id_content_id: {
            user_id: userId,
            content_id: contentId,
          },
        },
      });
      if (!userContentRecord) {
        // Link user to this content
        await prisma.userContent.create({
          data: {
            user_id: userId,
            content_id: contentId,
          },
        });
      }
    } else {
      // Create entirely new content + youtubeContent
      contentId = uuid();

      // 7A) Create the parent Content record
      await prisma.content.create({
        data: {
          content_id: contentId,
          content_type: "YOUTUBE_CONTENT",
          created_at: new Date(),

          // Link to user
          users: {
            create: {
              user_id: userId,
            },
          },

          // Create the youtubeContent child
          youtubeContent: {
            create: {
              youtube_id: videoId,
              title: videoTitle,
              description: videoDescription,
              thumbnail_url: videoThumbnail,
              youtube_url: youtube_url,
              transcript: processedTranscriptChunks,
            },
          },
        },
      });

      // 7B) Skip vector embeddings
      console.log("Skipping embeddings generation");
    }
    // ----------------------------------------------------------------------
    // 8) Link the content to the chosen space (via SpaceContent pivot)
    // ----------------------------------------------------------------------
    await prisma.spaceContent.upsert({
      where: {
        space_id_content_id: {
          space_id: spaceId,
          content_id: contentId,
        },
      },
      create: {
        space_id: spaceId,
        content_id: contentId,
      },
      update: {},
    });

    // Debug: List all content IDs for this space after upsert
    const spaceWithContents = await prisma.space.findUnique({
      where: { space_id: spaceId },
      include: { contents: true },
    });

    // ----------------------------------------------------------------------
    // 9) Return the response in the shape your frontend expects
    // ----------------------------------------------------------------------
    // The front-end wants:
    //   {
    //     status: "success",
    //     data: { space_id, content_id, type, title, thumbnail_url },
    //   }
    
    // We'll respond with 200 either way (new or existing).
    // Log the response for debugging
    console.log("Returning content creation response with space_id:", spaceId);
    
    return NextResponse.json(
      {
        status: "success",
        data: {
          space_id: spaceId,
          content_id: contentId,
          youtube_id: videoId,
          type: "YOUTUBE_CONTENT",
          title: videoTitle,
          thumbnail_url: videoThumbnail,
        },
        // Also include at top level for easier access
        space_id: spaceId,
        content_id: contentId,
        content: {
          space_id: spaceId,
          id: contentId,
          type: "YOUTUBE_CONTENT",
          title: videoTitle
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while adding youtube content: ", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id"); // Extract ID from query parameters

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    // Try to find basic content information first with all related content
    const content = await prisma.content.findUnique({
      where: { content_id: id },
      include: { 
        metadata: true,
        youtubeContent: true,
        documentContent: true,
        audioContent: true,
        imageContent: true
      }
    });

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Prepare summary array based on content type with consistent parsing
    let summaryText = [];
    let title = 'Untitled Content';
    
    // Get summary from unified metadata if available using consistent processing
    if (content.metadata?.summary) {
      summaryText = processSummaryData(content.metadata.summary);
    }
    
    // Set title based on content type
    if (content.youtubeContent) {
      title = content.youtubeContent.title;
    } else if (content.documentContent) {
      title = content.documentContent.filename;
    } else if (content.audioContent) {
      title = content.audioContent.title || 'Audio Content';
    } else if (content.imageContent) {
      title = content.imageContent.title || 'Image Content';
    }
    
    // Ensure summaryText is always an array
    if (!Array.isArray(summaryText)) {
      summaryText = [summaryText];
    }
    
    // Construct a response with all the necessary data
    const response = {
      id: content.content_id,
      title: title,
      summary: summaryText,
      content_type: content.content_type,
      created_at: content.created_at?.toISOString(),
    };

    // Add YouTube-specific data if it exists
    if (content.youtubeContent) {
      return NextResponse.json({
        ...response,
        youtube_url: content.youtubeContent.youtube_url,
        youtube_id: content.youtubeContent.youtube_id,
        transcript: content.youtubeContent.transcript,
        type: "YOUTUBE_CONTENT"
      });
    }

    // Add Document-specific data if it exists
    if (content.documentContent) {
      return NextResponse.json({
        ...response,
        filename: content.documentContent.filename,
        file_url: content.documentContent.file_url,
        doc_id: content.documentContent.doc_id,
        hash: content.documentContent.hash,
        text: content.documentContent.text,
        type: "DOCUMENT_CONTENT"
      });
    }

    // Add Audio-specific data if it exists
    if (content.audioContent) {
      return NextResponse.json({
        ...response,
        audio_id: content.audioContent.audio_id,
        audio_url: content.audioContent.audio_url,
        duration: content.audioContent.duration,
        transcript: content.audioContent.transcript,
        type: "AUDIO_CONTENT"
      });
    }

    // Add Image-specific data if it exists
    if (content.imageContent) {
      return NextResponse.json({
        ...response,
        image_id: content.imageContent.image_id,
        image_url: content.imageContent.image_url,
        text: content.imageContent.text,
        type: "IMAGE_CONTENT"
      });
    }

    // Return basic content if no specific content type was found
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
