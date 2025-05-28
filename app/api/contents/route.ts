import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import axios from "axios";
import { v4 as uuid } from "uuid";

// Import only what you need - remove embedding-related imports
import { fetchTranscripts, preprocessTranscript, transcriptInterface } from "@/lib/utils";
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
    // 1) Verify JWT token from the Authorization header
    // ----------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let decoded: { user_id?: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { user_id?: string };
      // Replace "secret_key" with your real JWT secret or env var
    } catch (err) {
      console.error("JWT verification failed:", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded?.user_id;
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    // Ensure the user actually exists in the DB
    const existingUser = await prisma.user.findUnique({
      where: { user_id: userId },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

  // Try to find as YouTube content first
  const youtubeContent = await prisma.youtubeContent.findUnique({
    where: { content_id: id },
    include: {
      content: {
        select: {
          content_type: true,
        },
      },
    },
  });

  if (youtubeContent) {
    return NextResponse.json({
      youtubeUrl: youtubeContent.youtube_url,
      youtube_id: youtubeContent.youtube_id,
      thumbnailUrl: youtubeContent.thumbnail_url,
      transcript: youtubeContent.transcript,
      type: "YOUTUBE_CONTENT",
    });
  }

  // Try to find as Document content
  const documentContent = await prisma.documentContent.findUnique({
    where: { content_id: id },
    include: {
      content: {
        select: {
          content_type: true,
        },
      },
    },
  });

  if (documentContent) {
    return NextResponse.json({
      filename: documentContent.filename,
      file_url: documentContent.file_url,
      doc_id: documentContent.doc_id,
      hash: documentContent.hash,
      type: "DOCUMENT_CONTENT",
      text: documentContent.text,
    });
  }

  return NextResponse.json({ error: "Content not found" }, { status: 404 });
}
