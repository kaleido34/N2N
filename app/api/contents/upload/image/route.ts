import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateQuiz, generateFlashCards, generateMindMap, summarizeChunks, transcriptInterface } from "@/lib/utils";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function extractTextFromImageWithPython(file: Blob): Promise<{ image_id: string, text: string, transcript: any }> {
  const formData = new FormData();
  formData.append("file", file);
  // Call the Python extractor server
  const res = await fetch("http://localhost:5005/extract/image", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to extract image text via Python server");
  const data = await res.json();
  return {
    image_id: data.image_id,
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
  const title = formData.get("title") || "Unnamed Image";
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

  // Extract text from image using Python server
  let imageData;
  try {
    imageData = await extractTextFromImageWithPython(file);
  } catch (err) {
    console.error("Failed to extract image text:", err);
    return new Response("Failed to extract image text", { status: 500 });
  }

  const { image_id, text, transcript } = imageData;

  // Convert text to transcript-like format for AI processing
  function splitTextToTranscript(text: string, segmentWordCount = 60): transcriptInterface[] {
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    let transcript: transcriptInterface[] = [];
    let buffer = "";
    let wordCount = 0;
    let offset = 0;
    let idx = 0;
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      buffer += (buffer ? " " : "") + sentence.trim();
      wordCount += words.length;
      if (wordCount >= segmentWordCount) {
        transcript.push({
          text: buffer,
          duration: 0, // Not available for images
          offset: idx,
          lang: "en",
        });
        idx += wordCount;
        buffer = "";
        wordCount = 0;
      }
    }
    if (buffer) {
      transcript.push({ text: buffer, duration: 0, offset: idx, lang: "en" });
    }
    return transcript;
  }

  const transcriptArr = splitTextToTranscript(text);
  const transcriptText = transcriptArr.map(t => t.text).join(" ");

  // Generate AI features
  let quiz = null, flashcards = null, mindmap = null, summary = null;
  try {
    [quiz, flashcards, mindmap, summary] = await Promise.all([
      generateQuiz(transcriptText),
      generateFlashCards(transcriptText),
      generateMindMap(transcriptText),
      summarizeChunks(transcriptText),
    ]);
  } catch (err) {
    // If AI fails, continue with what we have
    console.error("AI generation failed:", err);
  }

  // Create new content/lesson in DB
  const contentId = uuid();
  const filename = (file as File).name || "image.jpg";
  const imageUrl = ""; // In a real app, you'd upload to S3 and get URL

  // Create content with imageContent
  await prisma.content.create({
    data: {
      content_id: contentId,
      content_type: "IMAGE_CONTENT",
      imageContent: {
        create: {
          image_id: image_id,
          title: title as string,
          description: description as string,
          image_url: imageUrl,
          text: text,
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
