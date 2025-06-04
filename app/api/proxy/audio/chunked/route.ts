import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Import the google-tts-api package
const googleTTS = require('google-tts-api');

// TTS Configuration - matching the main audio route
const TTS_CONFIG = {
  MAX_CHUNK_LENGTH: 180,
  REQUEST_DELAY: 1200, // 50 requests per minute
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000
};

// Rate limiting state
const rateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowStart: Date.now()
};

// Rate limiting function
async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  
  if (now - rateLimitState.windowStart > 60000) {
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }
  
  if (rateLimitState.requestCount >= 50) {
    const waitTime = 60000 - (now - rateLimitState.windowStart);
    console.warn(`Rate limit exceeded. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = Date.now();
  }
  
  const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
  if (timeSinceLastRequest < TTS_CONFIG.REQUEST_DELAY) {
    const delay = TTS_CONFIG.REQUEST_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  rateLimitState.lastRequestTime = Date.now();
  rateLimitState.requestCount++;
}

// Generate TTS URL with retry logic
async function generateTTSWithRetry(text: string, attempt: number = 1): Promise<string> {
  try {
    await checkRateLimit();
    
    const cleanText = text
      .replace(/\[object Object\]/g, 'content')
      .replace(/\s+/g, ' ')
      .trim();
    
    const encodedText = encodeURIComponent(cleanText);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&total=1&idx=0&textlen=${cleanText.length}&client=tw-ob&prev=input&ttsspeed=1`;
    
    // Validate URL
    new URL(ttsUrl);
    
    return ttsUrl;
  } catch (error) {
    console.error(`TTS generation attempt ${attempt} failed:`, error);
    
    if (attempt < TTS_CONFIG.RETRY_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, TTS_CONFIG.RETRY_DELAY * attempt));
      return generateTTSWithRetry(text, attempt + 1);
    }
    
    throw new Error(`Failed to generate TTS after ${TTS_CONFIG.RETRY_ATTEMPTS} attempts: ${error}`);
  }
}

// Text chunking function
function chunkTextSafely(text: string): string[] {
  if (!text || text.length <= TTS_CONFIG.MAX_CHUNK_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk && (currentChunk.length + trimmedSentence.length + 1) > TTS_CONFIG.MAX_CHUNK_LENGTH) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Split long chunks by words if needed
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= TTS_CONFIG.MAX_CHUNK_LENGTH) {
      finalChunks.push(chunk);
    } else {
      const words = chunk.split(' ');
      let wordChunk = "";
      
      for (const word of words) {
        if ((wordChunk + " " + word).length > TTS_CONFIG.MAX_CHUNK_LENGTH) {
          if (wordChunk) finalChunks.push(wordChunk.trim());
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? " " : "") + word;
        }
      }
      
      if (wordChunk) finalChunks.push(wordChunk.trim());
    }
  }
  
  return finalChunks;
}

// Stream chunks as they're ready instead of concatenating
async function* generateAudioChunks(textChunks: string[]) {
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    console.log(`Streaming chunk ${i + 1}/${textChunks.length}: "${chunk.substring(0, 50)}..."`);
    
    try {
      const ttsUrl = await generateTTSWithRetry(chunk);
      
      // Fetch the audio data
      const response = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chunk ${i + 1}: ${response.status}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      console.log(`Chunk ${i + 1} ready (${audioBuffer.byteLength} bytes)`);
      
      yield new Uint8Array(audioBuffer);
      
    } catch (error) {
      console.error(`Failed to process chunk ${i + 1}:`, error);
      // Yield a small silence buffer as fallback
      yield new Uint8Array(1024); // Small silence
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const content_id = searchParams.get("content_id");
    const chunkIndex = searchParams.get("chunk");
    
    if (!content_id) {
      return NextResponse.json({ message: "Missing content_id parameter" }, { status: 400 });
    }
    
    // Get the content and summary text
    const metadata = await prisma.metadata.findUnique({
      where: { content_id }
    });
    
    if (!metadata?.summary) {
      return NextResponse.json({ message: "No summary found for content" }, { status: 404 });
    }
    
    // Extract readable text from summary
    let readableText = "";
    
    try {
      const parsedSummary = JSON.parse(metadata.summary);
      
      if (Array.isArray(parsedSummary)) {
        readableText = parsedSummary.map((section: any) => {
          if (section && typeof section === 'object' && 'content' in section) {
            return String(section.content || '');
          }
          return String(section || '');
        }).join('. ');
      } else if (parsedSummary?.sections && Array.isArray(parsedSummary.sections)) {
        readableText = parsedSummary.sections.map((section: any) => {
          if (section && typeof section === 'object' && 'content' in section) {
            return String(section.content || '');
          }
          return String(section || '');
        }).join('. ');
      } else {
        readableText = String(parsedSummary);
      }
    } catch (jsonError) {
      readableText = metadata.summary;
    }
    
    // Clean the text
    readableText = readableText
      .replace(/\[object Object\]/g, 'content')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!readableText || readableText.length < 5) {
      readableText = "This is a summary of your content. Thank you for using our system.";
    }
    
    // Chunk the text
    const textChunks = chunkTextSafely(readableText);
    
    console.log(`Generated ${textChunks.length} chunks from text of ${readableText.length} characters`);
    
    if (textChunks.length === 1) {
      // Single chunk, serve the audio directly
      try {
        console.log('Serving single chunk audio directly');
        
        const ttsUrl = await generateTTSWithRetry(textChunks[0]);
        
        // Fetch the audio data directly and serve it
        const response = await fetch(ttsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
            "Referer": "https://translate.google.com/",
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch single chunk: ${response.status}`);
        }
        
        const audioBuffer = await response.arrayBuffer();
        
        console.log(`Serving single chunk directly (${audioBuffer.byteLength} bytes)`);
        
        // Return the audio data directly
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": audioBuffer.byteLength.toString(),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "X-Chunk-Count": "1",
            "X-Total-Length": readableText.length.toString()
          }
        });
        
      } catch (error) {
        console.error("Error serving single chunk:", error);
        return NextResponse.json({ 
          message: "Failed to generate single chunk audio", 
          error: String(error) 
        }, { status: 500 });
      }
    }
    
    // If requesting a specific chunk
    if (chunkIndex !== null) {
      const index = parseInt(chunkIndex);
      if (index >= 0 && index < textChunks.length) {
        try {
          console.log(`Serving audio for chunk ${index + 1}/${textChunks.length}`);
          
          const ttsUrl = await generateTTSWithRetry(textChunks[index]);
          
          // Fetch the audio data directly and serve it
          const response = await fetch(ttsUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
              "Referer": "https://translate.google.com/",
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch chunk ${index + 1}: ${response.status}`);
          }
          
          const audioBuffer = await response.arrayBuffer();
          
          console.log(`Serving chunk ${index + 1} directly (${audioBuffer.byteLength} bytes)`);
          
          // Return the audio data directly
          return new Response(audioBuffer, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": audioBuffer.byteLength.toString(),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=3600",
              "X-Chunk-Index": index.toString(),
              "X-Total-Chunks": textChunks.length.toString()
            }
          });
          
        } catch (error) {
          console.error(`Error serving chunk ${index + 1}:`, error);
          return NextResponse.json({ 
            message: `Failed to generate chunk ${index + 1}`, 
            error: String(error) 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          message: `Invalid chunk index: ${index}. Available chunks: 0-${textChunks.length - 1}` 
        }, { status: 400 });
      }
    }
    
    // For multiple chunks, return a playlist-style response instead of concatenated audio
    const chunkUrls = textChunks.map((_, index) => 
      `/api/proxy/audio/chunked?content_id=${content_id}&chunk=${index}&_t=${Date.now()}`
    );
    
    // Return an M3U8-style playlist or a simple streaming response
    return NextResponse.json({
      type: "chunked_audio",
      totalChunks: textChunks.length,
      chunks: chunkUrls,
      metadata: {
        contentId: content_id,
        totalLength: readableText.length,
        chunkSizes: textChunks.map(chunk => chunk.length)
      }
    }, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "X-Chunk-Count": textChunks.length.toString(),
        "X-Total-Length": readableText.length.toString()
      }
    });
    
  } catch (error) {
    console.error("Error in chunked audio generation:", error);
    return NextResponse.json({ 
      message: "Failed to generate chunked audio", 
      error: String(error) 
    }, { status: 500 });
  }
} 