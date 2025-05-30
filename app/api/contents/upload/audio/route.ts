import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateQuiz, generateFlashCards, generateMindMap, summarizeChunks, transcriptInterface } from "@/lib/utils";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function extractTextFromAudioWithPython(file: Blob): Promise<{ audio_id: string, text: string, transcript: any }> {
  const formData = new FormData();
  formData.append("file", file);
  // Call the Python extractor server
  const res = await fetch("http://localhost:5005/extract/audio", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to extract audio text via Python server");
  const data = await res.json();
  return {
    audio_id: data.audio_id,
    text: data.text || "",
    transcript: data.transcript
  };
}

export async function POST(req: NextRequest) {
  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get("file");
  const userId = formData.get("userId");
  const spaceId = formData.get("spaceId");
  const title = formData.get("title") || "Unnamed Audio";
  const description = formData.get("description") || "";

  if (!file || !(file instanceof Blob)) {
    return new Response("No file uploaded", { status: 400 });
  }
  if (!userId || typeof userId !== "string") {
    return new Response("No userId provided", { status: 400 });
  }

  // If no spaceId, find or create a Default space for this user
  let finalSpaceId = typeof spaceId === "string" && spaceId ? spaceId : undefined;
  if (!finalSpaceId) {
    let defaultSpace = await prisma.space.findFirst({
      where: {
        user_id: userId,
        space_name: "Default",
      },
    });
    if (!defaultSpace) {
      defaultSpace = await prisma.space.create({
        data: {
          user_id: userId,
          space_name: "Default",
        },
      });
    }
    finalSpaceId = defaultSpace.space_id;
  }

  // Extract text from audio using Python server with Whisper
  let audioData;
  try {
    audioData = await extractTextFromAudioWithPython(file);
  } catch (err) {
    console.error("Failed to extract audio transcription:", err);
    return new Response("Failed to transcribe audio", { status: 500 });
  }

  const { audio_id, text, transcript } = audioData;

  // Generate AI features using the transcribed text
  let quiz = null, flashcards = null, mindmap = null, summary = null;
  try {
    [quiz, flashcards, mindmap, summary] = await Promise.all([
      generateQuiz(text),
      generateFlashCards(text),
      generateMindMap(text),
      summarizeChunks(text),
    ]);
  } catch (err) {
    // If AI fails, continue with what we have
    console.error("AI generation failed:", err);
  }

  // Create new content/lesson in DB
  const contentId = uuid();
  const filename = (file as File).name || "audio.mp3";
  const audioUrl = ""; // In a real app, you'd upload to S3 and get URL
  const duration = transcript.segments.length > 0 
    ? Math.round(transcript.segments[transcript.segments.length - 1].end) 
    : 0;

  // Create content with audioContent
  await prisma.content.create({
    data: {
      content_id: contentId,
      content_type: "AUDIO_CONTENT",
      audioContent: {
        create: {
          audio_id: audio_id,
          title: title as string,
          description: description as string,
          audio_url: audioUrl,
          duration: duration,
          transcript: transcript,
        },
      },
      metadata: {
        create: {
          summary: summary || null,
          flashcards: flashcards ? JSON.parse(flashcards) : null,
          mindmap: mindmap ? JSON.parse(mindmap) : null,
          quiz: quiz ? JSON.parse(quiz) : null,
        },
      },
      users: {
        create: {
          user_id: userId,
        },
      },
      spaces: {
        create: {
          space_id: finalSpaceId,
        },
      },
    },
  });

  // Ensure userContent relation exists
  await prisma.userContent.upsert({
    where: {
      user_id_content_id: {
        user_id: userId,
        content_id: contentId,
      },
    },
    update: {},
    create: {
      user_id: userId,
      content_id: contentId,
    },
  });

  return new Response(JSON.stringify({ contentId, spaceId: finalSpaceId }), { status: 200 });
}
