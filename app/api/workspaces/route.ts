import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    // 1) Authenticate user with centralized helper
    const { user, error } = await authenticateUser(req);
    if (error) {
      return error;
    }

    const userId = user.user_id;

    // 3) Fetch all workspaces belonging to this user, including their contents
    const userSpaces = await prisma.space.findMany({
      where: { user_id: userId },
      include: {
        contents: {
          include: {
            content: {
              include: {
                youtubeContent: true, // Include YouTube-specific data
                documentContent: true, // Include Document-specific data
                audioContent: true, // Include Audio-specific data
                imageContent: true, // Include Image-specific data
                metadata: true, // Include unified metadata
              },
            },
          },
        },
      },
    });

    // Log the request for debugging
    console.log(`[API] GET /api/workspaces request from user ${userId}`);
    
    // 4) Transform the data into a front-end-friendly shape if needed
    const workspaces = userSpaces.map((space: any) => ({
      id: space.space_id,
      name: space.space_name,
      createdAt: space.created_at,
      contents: space.contents.map((spaceContent: any) => ({
        id: spaceContent.content.content_id,
        type: spaceContent.content.content_type,
        createdAt: spaceContent.content.created_at,
        // Get title from the appropriate content type
        title: spaceContent.content.youtubeContent?.title || 
               spaceContent.content.imageContent?.title ||
               spaceContent.content.audioContent?.title ||
               spaceContent.content.documentContent?.filename ||
               null,
        thumbnailUrl: spaceContent.content.youtubeContent?.thumbnail_url || null,
        // Include filename and fileUrl for all content types
        filename: spaceContent.content.documentContent?.filename || 
                 spaceContent.content.imageContent?.image_url ||
                 spaceContent.content.audioContent?.file_url ||
                 null,
        fileUrl: spaceContent.content.documentContent?.file_url ||
                spaceContent.content.imageContent?.image_url ||
                spaceContent.content.audioContent?.file_url ||
                null,
        youtube_id: spaceContent.content.youtubeContent?.youtube_id || null,
      })),
    }));

    // 5) Return the workspaces with cache control headers
    const response = NextResponse.json({ workspaces });
    
    // Add cache control headers to prevent excessive calls
    response.headers.set('Cache-Control', 'private, max-age=10');
    response.headers.set('X-API-Rate-Limit', 'true');
    
    return response;
  } catch (error) {
    console.error("Error fetching user workspaces:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user with centralized helper
    const { user, error } = await authenticateUser(req);
    if (error) {
      return error;
    }

    const userId = user.user_id;

    // Read JSON body
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Create the workspace in DB
    const newWorkspace = await prisma.space.create({
      data: {
        user_id: userId,
        space_name: name.trim(),
      },
    });

    // Return the created workspace
    return NextResponse.json(
      {
        id: newWorkspace.space_id,
        name: newWorkspace.space_name,
        createdAt: newWorkspace.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
