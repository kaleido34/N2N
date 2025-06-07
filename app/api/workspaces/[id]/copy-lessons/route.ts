import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser } from "@/lib/auth-helpers";

/**
 * POST /api/workspaces/[id]/copy-lessons
 * Copies lessons from personal workspace or other workspaces to the specified workspace
 */
export async function POST(
  request: NextRequest,
  context: { params: Record<string, string> }
) {
  try {
    // Get the target workspace ID from URL params
    const params = await context.params;
    const targetWorkspaceId = params.id;
    
    if (!targetWorkspaceId) {
      return NextResponse.json({ message: "Target workspace ID is required" }, { status: 400 });
    }

    // Authenticate user
    const { user, error } = await authenticateUser(request);
    if (error) {
      return error;
    }
    
    const userId = user.user_id;

    // Get the lesson IDs to copy from request body
    const { lessonIds } = await request.json();
    
    if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return NextResponse.json({ message: "Lesson IDs are required" }, { status: 400 });
    }

    // Verify that the target workspace belongs to the user
    const targetWorkspace = await prisma.space.findFirst({
      where: {
        space_id: targetWorkspaceId,
        user_id: userId,
      },
    });

    if (!targetWorkspace) {
      return NextResponse.json(
        { message: "Target workspace not found or not yours" },
        { status: 404 }
      );
    }

    // Verify that all lessons belong to the user (from any of their workspaces)
    const lessons = await prisma.content.findMany({
      where: {
        content_id: { in: lessonIds },
        spaces: {
          some: {
            space: {
              user_id: userId
            }
          }
        }
      },
      include: {
        spaces: {
          include: {
            space: true
          }
        }
      }
    });

    if (lessons.length !== lessonIds.length) {
      return NextResponse.json(
        { message: "Some lessons not found or not yours" },
        { status: 404 }
      );
    }

    // Check which lessons are already in the target workspace
    const existingConnections = await prisma.spaceContent.findMany({
      where: {
        space_id: targetWorkspaceId,
        content_id: { in: lessonIds }
      }
    });

    const existingLessonIds = existingConnections.map(conn => conn.content_id);
    const lessonsToAdd = lessonIds.filter(id => !existingLessonIds.includes(id));

    if (lessonsToAdd.length === 0) {
      return NextResponse.json(
        { message: "All lessons are already in the target workspace" },
        { status: 200 }
      );
    }

    // Create SpaceContent entries to link lessons to the target workspace
    const spaceContentEntries = lessonsToAdd.map(lessonId => ({
      space_id: targetWorkspaceId,
      content_id: lessonId,
    }));

    await prisma.spaceContent.createMany({
      data: spaceContentEntries,
    });

    console.log(`[API] Copied ${lessonsToAdd.length} lessons to workspace ${targetWorkspaceId}`);

    return NextResponse.json({
      message: `Successfully copied ${lessonsToAdd.length} lesson(s) to workspace`,
      copiedCount: lessonsToAdd.length,
      skippedCount: existingLessonIds.length,
    }, { status: 200 });

  } catch (error) {
    console.error("Error copying lessons:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 