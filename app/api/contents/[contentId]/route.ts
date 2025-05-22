import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function DELETE(req: NextRequest, { params }: { params: { contentId: string } }) {
  const { contentId } = params;
  // 1. Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  let userId: string | undefined;
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    userId = (decoded as any).user_id;
  } catch (err) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  // 2. Check if content exists and belongs to user
  const userContent = await prisma.userContent.findUnique({
    where: {
      user_id_content_id: {
        user_id: userId!,
        content_id: contentId,
      },
    },
  });
  if (!userContent) {
    return NextResponse.json({ error: "Content not found or not owned by user" }, { status: 404 });
  }
  // 3. Delete the user-content link (and optionally the content if no one else owns it)
  await prisma.userContent.delete({
    where: {
      user_id_content_id: {
        user_id: userId!,
        content_id: contentId,
      },
    },
  });
  // Optionally, delete the content if no other user owns it
  const otherLinks = await prisma.userContent.findMany({
    where: { content_id: contentId },
  });
  if (otherLinks.length === 0) {
    await prisma.content.delete({ where: { content_id: contentId } });
  }
  return NextResponse.json({ success: true });
} 