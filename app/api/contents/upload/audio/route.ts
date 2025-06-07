import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import { generateQuiz, generateFlashCards, generateMindMap, summarizeChunks, transcriptInterface } from "@/lib/utils";
import { parseAiResponse } from "@/lib/ai-utils";

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
  
  // Ensure transcript is always in JSON format
  let transcriptData = data.transcript;
  
  // If transcript is a string (potentially a JSON string), parse it
  if (typeof transcriptData === 'string') {
    try {
      transcriptData = JSON.parse(transcriptData);
    } catch (e) {
      console.error('Error parsing transcript string:', e);
      // If parsing fails, create a basic structure
      transcriptData = { segments: [], text: data.text || "" };
    }
  } 
  // If transcript is null/undefined, create a basic structure
  else if (!transcriptData) {
    transcriptData = { segments: [], text: data.text || "" };
  }
  
  return {
    audio_id: data.audio_id,
    text: data.text || "",
    transcript: transcriptData
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
    // Generate all AI features in parallel
    const results = await Promise.all([
      generateQuiz(text),
      generateFlashCards(text),
      generateMindMap(text),
      summarizeChunks(text).then(summary => {
        // Properly parse AI response which may contain markdown code blocks
        if (summary) {
          try {
            // Use the AI response parser to handle markdown formatting (```json ... ```)
            const parsed = parseAiResponse(summary);
            if (parsed) {
              // Return the parsed object directly, don't stringify it here
              // The database storage logic will handle stringification
              return parsed;
            }
          } catch (e) {
            console.error('Error processing summary with parseAiResponse:', e);
            // Fallback: try to clean manually and parse
            try {
              const cleaned = summary.replace(/```json\n?|```/g, '').trim();
              const fallbackParsed = JSON.parse(cleaned);
              // Return the parsed object directly
              return fallbackParsed;
            } catch (fallbackError) {
              console.error('Fallback parsing also failed:', fallbackError);
              // Create a basic structure for plain text
              return {
                sections: [
                  { type: 'heading', level: 2, content: 'Summary' },
                  { type: 'paragraph', content: summary }
                ]
              };
            }
          }
        }
        return null;
      }),
    ]);
    
    [quiz, flashcards, mindmap, summary] = results;
    
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
  
  const contentData = {
    content_id: contentId,
    content_type: "AUDIO_CONTENT" as const,
    created_at: new Date(),
    audioContent: {
      create: {
        audio_id: uuid(),
        title: filename,
        description: `Audio lesson from ${filename}`,
        audio_url: audioUrl,
        duration: duration,
        transcript: transcript,
      }
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
  };

  await prisma.content.create({
    data: contentData,
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

  // Format the response to match the YouTube content creation API
  // This ensures consistent handling in the frontend
  return new Response(JSON.stringify({
    status: "success",
    data: {
      space_id: finalSpaceId,
      content_id: contentId,
      type: "AUDIO_CONTENT",
      title: title || filename || "Audio Recording"
    },
    // Also include at top level for easier access by the ContentForm component
    space_id: finalSpaceId,
    content_id: contentId,
    content: {
      space_id: finalSpaceId,
      id: contentId,
      type: "AUDIO_CONTENT",
      title: title || filename || "Audio Recording"
    }
  }), { status: 200 });
}
