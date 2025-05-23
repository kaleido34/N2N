import { NextRequest } from "next/server";
import { getAudioUrl } from "google-tts-api";

// Maximum text length for Google TTS in a single request (actual limit is around 200 chars)
const MAX_TEXT_LENGTH = 200;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response("No text provided", { status: 400 });
    }

    // Implement a different approach for long text
    if (text.length > MAX_TEXT_LENGTH) {
      console.log(`Text is too long (${text.length} chars), using alternative approach`);
      
      // Break the text into smaller chunks
      const chunks = splitTextIntoChunks(text, MAX_TEXT_LENGTH);
      
      // Process only the first chunk for now (as a fallback)
      const firstChunk = chunks[0];
      
      try {
        const url = getAudioUrl(firstChunk, {
          lang: "en",
          slow: false,
          host: "https://translate.google.com",
        });
        
        const audioRes = await fetch(url);
        
        if (!audioRes.ok) {
          console.error(`Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`);
          return new Response(`Audio fetch failed: ${audioRes.status}`, { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const audioBuffer = await audioRes.arrayBuffer();
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": "inline; filename=summary.mp3",
          },
        });
      } catch (fetchError) {
        console.error("Error fetching audio:", fetchError);
        return new Response(JSON.stringify({ error: "Failed to fetch audio", details: String(fetchError) }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Original approach for short text
      try {
        console.log(`Processing short text (${text.length} chars)`);
        const url = getAudioUrl(text, {
          lang: "en",
          slow: false,
          host: "https://translate.google.com",
        });
        
        const audioRes = await fetch(url, {
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000)
        });
        
        if (!audioRes.ok) {
          console.error(`Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`);
          return new Response(`Audio fetch failed: ${audioRes.status}`, { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const audioBuffer = await audioRes.arrayBuffer();
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": "inline; filename=summary.mp3",
          },
        });
      } catch (fetchError) {
        console.error("Error fetching audio:", fetchError);
        return new Response(JSON.stringify({ error: "Failed to fetch audio", details: String(fetchError) }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ error: "TTS processing error", details: String(e) }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to split text into chunks at sentence boundaries
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit, push the current chunk and start a new one
    if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    
    // If a single sentence is longer than the max length, split it by words
    if (sentence.length > maxLength) {
      const words = sentence.split(/\s+/);
      let wordChunk = "";
      
      for (const word of words) {
        if (wordChunk.length + word.length + 1 > maxLength && wordChunk.length > 0) {
          chunks.push(wordChunk.trim());
          wordChunk = "";
        }
        wordChunk += (wordChunk ? " " : "") + word;
      }
      
      if (wordChunk.length > 0) {
        currentChunk += (currentChunk ? " " : "") + wordChunk;
      }
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
    
    // If the current chunk is getting too long, push it
    if (currentChunk.length > maxLength * 0.8) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
  }
  
  // Add any remaining text
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Ensure we have at least one chunk
  if (chunks.length === 0 && text.length > 0) {
    chunks.push(text.substring(0, maxLength));
  }
  
  return chunks;
}