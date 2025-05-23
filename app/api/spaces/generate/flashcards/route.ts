import { NextRequest, NextResponse } from "next/server";
import { generateFlashCards } from "@/lib/utils";
import { verifyJwtToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    let token = req.headers.get("authorization");
    if (!token) return NextResponse.json({ message: "Missing authorization token." }, { status: 401 });
    if (token.startsWith("Bearer ")) token = token.slice(7);
    const user = await verifyJwtToken(token, process.env.JWT_SECRET!);
    if (!user || !user.user_id) return NextResponse.json({ message: "Invalid or expired token." }, { status: 403 });

    const body = await req.json();
    const { text, video_id, content_id } = body;
    if (!content_id) return NextResponse.json({ message: "Please provide content_id!" }, { status: 403 });

    const userContentExist = await prisma.userContent.findUnique({
      where: { user_id_content_id: { user_id: user.user_id, content_id } }
    });
    if (!userContentExist) return NextResponse.json({ message: "Content not found for the user!" }, { status: 401 });

    if (text) {
      const flashcards = await generateFlashCards(text);
      if (!flashcards) return NextResponse.json({ message: "Could not generate flashcards" }, { status: 500 });
      return NextResponse.json({ message: "Success", data: flashcards });
    } else if (video_id) {
      return NextResponse.json({ message: "Use GET for video lessons." }, { status: 400 });
    } else {
      return NextResponse.json({ message: "Please provide text or video_id!" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ message: "Error while generating flashcards!" }, { status: 500 });
  }
}