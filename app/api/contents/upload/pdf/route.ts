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

  // Find or create Personal Workspace for this user
  let finalSpaceId = typeof spaceId === "string" && spaceId ? spaceId : undefined;
  if (!finalSpaceId) {
    let personalWorkspace = await prisma.space.findFirst({
      where: {
        user_id: userId,
        space_name: {
          contains: "Personal",
          mode: 'insensitive'
        },
      },
    });
    
    if (!personalWorkspace) {
      // If no personal workspace exists, create one
      personalWorkspace = await prisma.space.create({
        data: {
          user_id: userId,
          space_name: "Personal Workspace",
        },
      });
    }
    finalSpaceId = personalWorkspace.space_id;
  }

  // Extract text from PDF using Python server
  let pdfData;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("http://localhost:5005/extract/pdf", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to extract PDF text via Python server");
    pdfData = await res.json();
  } catch (err) {
    return new Response("Failed to extract PDF text", { status: 500 });
  }

  const { doc_id, text, transcript: pdfTranscript } = pdfData;

  // --- Split text into transcript-like segments ---
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

  // --- Generate AI features ---
  let quiz = null, flashcards = null, mindmap = null, summary = null;
  try {
    // Generate all AI features in parallel
    const results = await Promise.all([
      generateQuiz(transcriptText),
      generateFlashCards(transcriptText),
      generateMindMap(transcriptText),
      (async (): Promise<string | null> => {
        try {
          let summaryData = await summarizeChunks(transcriptText);
          if (!summaryData) return null;
          
          // Ensure the summary is properly stringified before saving
          if (summaryData) {
            try {
              // If it's already a string, parse it to ensure it's valid JSON
              const parsed = typeof summaryData === 'string' ? JSON.parse(summaryData) : summaryData;
              // Then re-stringify it to ensure consistent format
              return JSON.stringify(parsed);
            } catch (e) {
              console.error('Error processing summary:', e);
              return null;
            }
          }
          return null;
        } catch (e) {
          console.error('Error generating summary:', e);
          return null;
        }
      })(),
    ]);
    
    [quiz, flashcards, mindmap, summary] = results;
    
  } catch (err) {
    // If AI fails, continue with what we have
    console.error("AI generation failed:", err);
  }

  // Create new content/lesson in DB
  const contentId = uuid();
  const filename = (file as File).name || "uploaded.pdf";
  await prisma.content.create({
    data: {
      content_id: contentId,
      content_type: "DOCUMENT_CONTENT",
      documentContent: {
        create: {
          filename: filename,
          file_url: "", // (optional: upload to S3 or similar)
          doc_id: doc_id, // Use the ID from the Python server
          hash: doc_id, // (for now, use docId as hash)
          text: text, // Store extracted PDF text
          transcript: pdfTranscript, // Store structured transcript from Python
        },
      },
      metadata: {
        create: {
          summary: summary ? JSON.stringify(summary) : null,
          flashcards: flashcards ? (typeof flashcards === 'string' ? JSON.parse(flashcards) : flashcards) : null,
          mindmap: mindmap ? (typeof mindmap === 'string' ? JSON.parse(mindmap) : mindmap) : null,
          quiz: quiz ? (typeof quiz === 'string' ? JSON.parse(quiz) : quiz) : null,
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

  // Format the response to match the YouTube content creation API
  // This ensures consistent handling in the frontend
  return new Response(JSON.stringify({
    status: "success",
    data: {
      space_id: finalSpaceId,
      content_id: contentId,
      type: "DOCUMENT_CONTENT",
      title: filename || "PDF Document"
    },
    // Also include at top level for easier access by the ContentForm component
    space_id: finalSpaceId,
    content_id: contentId,
    content: {
      space_id: finalSpaceId,
      id: contentId,
      type: "DOCUMENT_CONTENT",
      title: filename || "PDF Document"
    }
  }), { status: 200 });
}