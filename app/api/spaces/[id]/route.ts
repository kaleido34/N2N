import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth-helpers";

/**
 * GET /api/spaces/[id]
 * Fetches a single space by ID, ensuring it belongs to the logged-in user.
 * Also includes the space's content items (YoutubeContent, DocumentContent, etc.)
 */
export async function GET(
  request: NextRequest,
) {
  try {
    const params = request.nextUrl.searchParams;
    const spaceId = params.get("space_id") || "";

    // 1) Authenticate user with centralized helper
    const { user, error } = await authenticateUser(request);
    if (error) {
      return error;
    }
    
    const userId = user.user_id;

    // 3) Fetch the space that belongs to this user
    //    Include any related content (youtube, doc, etc.)
    const space = await prisma.space.findFirst({
      where: {
        space_id: spaceId,
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

    if (!space) {
      console.log(`[API] GET /api/spaces/${spaceId} from user ${userId}`);
      return NextResponse.json(
        { message: "Space not found or not yours" },
        { status: 404 }
      );
    }

    // 4) Transform to a simpler shape for the front-end if needed
    const transformed = {
      id: space.space_id,
      name: space.space_name,
      createdAt: space.created_at,
      contents: space.contents.map((spaceContent: any) => ({
        id: spaceContent.content.content_id,
        type: spaceContent.content.content_type,
        createdAt: spaceContent.content.created_at,
        title: spaceContent.content.youtubeContent?.title ?? null,
        thumbnailUrl:
          spaceContent.content.youtubeContent?.thumbnail_url ?? null,
        filename: spaceContent.content.documentContent?.filename ?? null,
        fileUrl: spaceContent.content.documentContent?.file_url ?? null,
      })),
    };

    return NextResponse.json({ space: transformed }, { status: 200 });
  } catch (error) {
    console.error("Error fetching space:", error);
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
    const spaceId = params.id;
    
    if (!spaceId) {
      return NextResponse.json({ message: "Space ID is required" }, { status: 400 });
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
    
    // Check if space exists and belongs to user
    const space = await prisma.space.findFirst({
      where: {
        space_id: spaceId,
        user_id: userId,
      },
    });

    if (!space) {
      return NextResponse.json(
        { message: "Space not found or not owned by you" },
        { status: 403 }
      );
    }

    // Delete the space
    await prisma.space.delete({
      where: {
        space_id: spaceId,
      },
    });

    return NextResponse.json({ message: "Space deleted successfully" });
  } catch (error) {
    console.error("Error deleting space:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
