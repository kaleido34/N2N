import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateQuiz, generateFlashCards, generateMindMap, summarizeChunks, transcriptInterface } from "@/lib/utils";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function extractTextFromPDFWithPython(file: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  // Call the Python extractor server
  const res = await fetch("http://localhost:5005/extract/pdf", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to extract PDF text via Python server");
  const data = await res.json();
  return data.text || "";
}

export async function POST(req: NextRequest) {
  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get("file");
  const userId = formData.get("userId");
  const spaceId = formData.get("spaceId");

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

  // Extract text from PDF using Python server
  let text = "";
  try {
    text = await extractTextFromPDFWithPython(file);
  } catch (err) {
    return new Response("Failed to extract PDF text", { status: 500 });
  }

  // --- NEW: Split text into transcript-like segments ---
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
          duration: 0, // Not available for docs
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

  // --- NEW: Generate AI features ---
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
  const docId = uuid();
  const filename = (file as File).name || "uploaded.pdf";
  await prisma.content.create({
    data: {
      content_id: contentId,
      content_type: "DOCUMENT_CONTENT",
      documentContent: {
        create: {
          filename: filename,
          file_url: "", // (optional: upload to S3 or similar)
          doc_id: docId,
          hash: docId, // (for now, use docId as hash)
          text: text, // Store extracted PDF text
          quiz: quiz ? JSON.parse(quiz) : null,
          flashcards: flashcards ? JSON.parse(flashcards) : null,
          mindmap: mindmap ? JSON.parse(mindmap) : null,
          summary: summary || null,
          transcript: JSON.stringify(transcriptArr),
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

  // Ensure userContent relation exists (fix for summary API)
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