import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";

export async function DELETE(req: NextRequest, { params }: { params: { contentId: string } }) {
  // Properly handle params by awaiting them for Next.js App Router
  const contentParams = await Promise.resolve(params);
  const contentId = contentParams.contentId;
  
  // 1. Authenticate user with centralized helper
  const { user, error } = await authenticateUser(req);
  if (error) {
    return error;
  }
  
  // 2. Check if user has access to this content
  const hasAccess = await checkContentAccess(user.user_id, contentId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Content not found or not accessible" }, { status: 403 });
  }
  // 3. Delete the user-content link (and optionally the content if no one else owns it)
  await prisma.userContent.delete({
    where: {
      user_id_content_id: {
        user_id: user.user_id,
        content_id: contentId,
      },
    },
  });
  // Optionally, delete the content if no other user owns it
  const otherLinks = await prisma.userContent.findMany({
    where: { content_id: contentId },
  });
  if (otherLinks.length === 0) {
    // Delete associated metadata first
    await prisma.metadata.deleteMany({ where: { content_id: contentId } });
    // Then delete the content
    await prisma.content.delete({ where: { content_id: contentId } });
  }
  return NextResponse.json({ success: true });
}