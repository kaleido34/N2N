import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth-helpers";

/**
 * GET /api/workspaces/[id]
 * Fetches a single workspace by ID, ensuring it belongs to the logged-in user.
 * Also includes the workspace's content items (YoutubeContent, DocumentContent, etc.)
 */
export async function GET(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  try {
    // In Next.js App Router we need to handle params asynchronously
    const params = await context.params;
    const workspaceId = params.id;
    
    if (!workspaceId) {
      return NextResponse.json({ message: "Workspace ID is required" }, { status: 400 });
    }

    // 1) Authenticate user with centralized helper
    const { user, error } = await authenticateUser(request);
    if (error) {
      return error;
    }
    
    const userId = user.user_id;

    // 3) Fetch the workspace that belongs to this user
    //    Include any related content (youtube, doc, etc.)
    const workspace = await prisma.space.findFirst({
      where: {
        space_id: workspaceId,
        user_id: userId,
      },
      include: {
        contents: {
          include: {
            content: {
              include: {
                youtubeContent: true,
                documentContent: true,
                audioContent: true,
                imageContent: true,
                metadata: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      console.log(`[API] GET /api/workspaces/${workspaceId} from user ${userId}`);
      return NextResponse.json(
        { message: "Workspace not found or not yours" },
        { status: 404 }
      );
    }

    // 4) Transform to a simpler shape for the front-end if needed
    const transformed = {
      id: workspace.space_id,
      name: workspace.space_name,
      createdAt: workspace.created_at,
      contents: workspace.contents.map((spaceContent: any) => ({
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
    };

    return NextResponse.json({ workspace: transformed }, { status: 200 });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Record<string, string> }
) {
  try {
    // In Next.js App Router we need to handle params asynchronously
    const params = await context.params;
    const workspaceId = params.id;
    
    if (!workspaceId) {
      return NextResponse.json({ message: "Workspace ID is required" }, { status: 400 });
    }

    // Extract auth headers - try multiple variations to ensure we get the token
    let authHeader = req.headers.get('authorization');
    if (!authHeader) {
      authHeader = req.headers.get('Authorization');
    }
    
    // If no authorization header, return error
    if (!authHeader) {
      return NextResponse.json(
        { message: "Missing authorization token. Please login again." },
        { status: 401 }
      );
    }
    
    // Extract token from header
    let token = "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }
    
    if (!token) {
      return NextResponse.json(
        { message: "Invalid authorization token format" },
        { status: 401 }
      );
    }
    
    // Use enhanced JWT verification with better error handling
    const { verifyJwtTokenWithDetails } = await import("@/lib/jwt");
    
    // Use the known development secret based on memory if env var is not available
    const secret = process.env.JWT_SECRET || 'development-jwt-secret-key-12345';
    
    // Try to verify with the secret using our enhanced verification
    const verificationResult = await verifyJwtTokenWithDetails(token, secret);
    
    // Handle expired tokens with a specific message
    if (verificationResult.isExpired) {
      return NextResponse.json(
        { message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }
    
    // Handle other token validation failures
    if (!verificationResult.payload || !verificationResult.payload.user_id) {
      return NextResponse.json(
        { message: verificationResult.error || "Authentication failed" },
        { status: 401 }
      );
    }
    
    const decodedUser = verificationResult.payload;
    const userId = decodedUser.user_id;
    
    // Check if workspace exists and belongs to user
    const workspace = await prisma.space.findFirst({
      where: {
        space_id: workspaceId,
        user_id: userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found or not owned by you" },
        { status: 403 }
      );
    }

    // Delete the workspace
    await prisma.space.delete({
      where: {
        space_id: workspaceId,
      },
    });

    return NextResponse.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
