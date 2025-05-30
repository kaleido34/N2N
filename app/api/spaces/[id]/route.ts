import { NextRequest, NextResponse } from "next/server";
import { verifyJwtToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

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

    // 1) Extract Bearer token
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2) Verify JWT
    const payload = await verifyJwtToken(token, process.env.JWT_SECRET!);
    const userId = payload?.user_id;
    if (!userId) {
      return NextResponse.json(
        { message: "Invalid token: missing user_id" },
        { status: 401 }
      );
    }

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

export async function DELETE(req: NextRequest) {
  try {
    // Get the space ID from the URL path instead of params
    const pathParts = req.nextUrl.pathname.split('/');
    const spaceId = pathParts[pathParts.length - 1]; // Last segment of the URL path
    
    if (!spaceId) {
      return NextResponse.json({ message: "Space ID is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const payload = await verifyJwtToken(token, process.env.JWT_SECRET!);
    const userId = payload?.user_id;
    if (!userId) {
      return NextResponse.json(
        { message: "Invalid token: missing user_id" },
        { status: 401 }
      );
    }
    
    // Check if space exists and belongs to user
    const space = await prisma.space.findFirst({
      where: {
        space_id: spaceId,
        user_id: userId,
      },
    });

    if (!space) {
      return NextResponse.json(
        { message: "Space not found or unauthorized" },
        { status: 404 }
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
