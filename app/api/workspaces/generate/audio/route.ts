import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateUser, checkContentAccess } from "@/lib/auth-helpers";
// Import the google-tts-api package correctly
const googleTTS = require('google-tts-api');

// Define type interfaces for content models to fix TypeScript errors
type ContentType = "YOUTUBE_CONTENT" | "DOCUMENT_CONTENT" | "AUDIO_CONTENT" | "IMAGE_CONTENT";

interface BaseContent {
  content_id: string;
  created_at: Date;
  content_type: ContentType;
}

interface YouTubeContent {
  title?: string;
  description?: string;
}

interface DocumentContent {
  filename?: string;
}

interface AudioContent {
  title?: string;
}

interface ImageContent {
  title?: string;
}

interface Content extends BaseContent {
  youtubeContent?: YouTubeContent | null;
  documentContent?: DocumentContent | null;
  audioContent?: AudioContent | null;
  imageContent?: ImageContent | null;
}

// TTS Configuration
const TTS_CONFIG = {
  MAX_CHUNK_LENGTH: 180, // Google TTS character limit per request
  MAX_REQUESTS_PER_MINUTE: 50, // Conservative rate limit
  CHUNK_OVERLAP: 10, // Overlap between chunks for smoother transitions
  REQUEST_DELAY: 1200, // Delay between requests in ms (50 req/min = 1200ms)
  MAX_TOTAL_LENGTH: 3000, // Maximum total text length to process
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000
};

// Rate limiting state (in production, use Redis or similar)
const rateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowStart: Date.now()
};

// Text chunking function with smart sentence breaking
function chunkTextSafely(text: string): string[] {
  if (!text || text.length <= TTS_CONFIG.MAX_CHUNK_LENGTH) {
    return [text];
  }

  // Limit total text length
  if (text.length > TTS_CONFIG.MAX_TOTAL_LENGTH) {
    console.warn(`Text too long (${text.length} chars), truncating to ${TTS_CONFIG.MAX_TOTAL_LENGTH}`);
    text = text.substring(0, TTS_CONFIG.MAX_TOTAL_LENGTH) + "...";
  }

  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by sentences first (more natural breaks)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // If adding this sentence would exceed the limit, finalize current chunk
    if (currentChunk && (currentChunk.length + trimmedSentence.length + 1) > TTS_CONFIG.MAX_CHUNK_LENGTH) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + trimmedSentence;
    }
  }
  
  // Add the last chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If we still have chunks that are too long, split them by words
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= TTS_CONFIG.MAX_CHUNK_LENGTH) {
      finalChunks.push(chunk);
    } else {
      // Split long chunks by words
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
  
  console.log(`Text chunked into ${finalChunks.length} parts:`, finalChunks.map(c => c.length));
  return finalChunks;
}

// Rate limiting function
async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Reset window if more than a minute has passed
  if (now - rateLimitState.windowStart > 60000) {
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }
  
  // Check if we've exceeded the rate limit
  if (rateLimitState.requestCount >= TTS_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    const waitTime = 60000 - (now - rateLimitState.windowStart);
    console.warn(`Rate limit exceeded. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = Date.now();
  }
  
  // Ensure minimum delay between requests
  const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
  if (timeSinceLastRequest < TTS_CONFIG.REQUEST_DELAY) {
    const delay = TTS_CONFIG.REQUEST_DELAY - timeSinceLastRequest;
    console.log(`Waiting ${delay}ms to respect rate limits`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  rateLimitState.lastRequestTime = Date.now();
  rateLimitState.requestCount++;
}

// Generate TTS URL with retry logic
async function generateTTSWithRetry(text: string, attempt: number = 1): Promise<string> {
  try {
    await checkRateLimit();
    
    // Clean text for TTS
    const cleanText = text
      .replace(/\[object Object\]/g, 'content')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Create direct Google TTS URL
    const encodedText = encodeURIComponent(cleanText);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&total=1&idx=0&textlen=${cleanText.length}&client=tw-ob&prev=input&ttsspeed=1`;
    
    // Validate URL
    new URL(ttsUrl);
    
    return ttsUrl;
  } catch (error) {
    console.error(`TTS generation attempt ${attempt} failed:`, error);
    
    if (attempt < TTS_CONFIG.RETRY_ATTEMPTS) {
      console.log(`Retrying TTS generation (attempt ${attempt + 1}/${TTS_CONFIG.RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, TTS_CONFIG.RETRY_DELAY * attempt));
      return generateTTSWithRetry(text, attempt + 1);
    }
    
    throw new Error(`Failed to generate TTS after ${TTS_CONFIG.RETRY_ATTEMPTS} attempts: ${error}`);
  }
}

// Main GET endpoint
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const content_id = params.get("content_id");
    const forceRegenerate = params.get("force") === "true";
    
    // Authenticate the user
    const { user, error } = await authenticateUser(req);
    if (error) return error;

    if (!content_id) {
      return NextResponse.json(
        { message: "Please provide content_id!" },
        { status: 400 }
      );
    }

    // Check if user has access to content
    const hasAccess = await checkContentAccess(user.user_id, content_id);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Content not found for the user!" },
        { status: 403 }
      );
    }

    // Check if audio summary already exists
    const existingMetadata = await prisma.metadata.findUnique({
      where: { content_id: content_id }
    });

    // Return existing audio if available and not forcing regeneration
    if (existingMetadata?.audio_summary && !forceRegenerate) {
      return NextResponse.json({
        message: "Audio summary found",
        data: {
          audioUrl: existingMetadata.audio_summary,
          summaryText: existingMetadata.summary || "Summary not available",
          isChunked: existingMetadata.audio_summary.includes('chunks=')
        }
      }, { status: 200 });
    }

    // Extract readable text from summary
    let readableText = "";
    
    if (existingMetadata?.summary) {
      try {
        const parsedSummary = JSON.parse(existingMetadata.summary);
        
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
        readableText = existingMetadata.summary;
      }
    }

    // Fallback to content title if no summary
    if (!readableText || readableText.includes('[object Object]')) {
      const contentResult = await prisma.content.findUnique({
        where: { content_id },
        include: {
          youtubeContent: true,
          documentContent: true,
          audioContent: true,
          imageContent: true
        }
      });

      if (!contentResult) {
        return NextResponse.json({ message: "Content not found" }, { status: 404 });
      }

      // Generate title-based text
      switch (contentResult.content_type) {
        case "YOUTUBE_CONTENT":
          readableText = `Summary of ${contentResult.youtubeContent?.title || 'video content'}`;
          break;
        case "DOCUMENT_CONTENT":
          readableText = `Summary of document ${contentResult.documentContent?.filename || 'file'}`;
          break;
        case "AUDIO_CONTENT":
          readableText = `Summary of audio ${contentResult.audioContent?.title || 'recording'}`;
          break;
        case "IMAGE_CONTENT":
          readableText = `Summary of image ${contentResult.imageContent?.title || 'content'}`;
          break;
        default:
          readableText = "Summary of your content";
      }
    }

    // Clean and validate text
    readableText = readableText
      .replace(/\[object Object\]/g, 'content')
      .replace(/\s+/g, ' ')
      .trim();

    if (!readableText || readableText.length < 5) {
      readableText = "This is a summary of your content. Thank you for using our system.";
    }

    console.log(`Processing TTS for text: "${readableText.substring(0, 100)}..." (${readableText.length} chars)`);

    // Chunk the text
    const textChunks = chunkTextSafely(readableText);
    
    if (textChunks.length === 1) {
      // Single chunk - simple case
      try {
        const ttsUrl = await generateTTSWithRetry(textChunks[0]);
        const timestamp = Date.now();
        const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(ttsUrl)}&format=mp3&_t=${timestamp}`;
        
        // Save to database - only update audio_summary, NOT the summary field
        await prisma.metadata.upsert({
          where: { content_id },
          update: {
            audio_summary: proxyUrl,
            updated_at: new Date()
          },
          create: {
            content_id,
            audio_summary: proxyUrl,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        return NextResponse.json({
          message: "Audio generated successfully",
          data: {
            audioUrl: proxyUrl,
            summaryText: readableText,
            chunkCount: 1,
            totalLength: readableText.length
          }
        }, { status: 200 });
        
      } catch (error) {
        console.error("Error generating single chunk TTS:", error);
        throw error;
      }
    } else {
      // Multiple chunks - create chunked audio endpoint
      console.log(`Creating chunked audio for ${textChunks.length} chunks`);
      
      const timestamp = Date.now();
      const chunkedUrl = `/api/proxy/audio/chunked?content_id=${content_id}&chunks=${textChunks.length}&_t=${timestamp}`;
      
      // Store chunks in a temporary format (in production, use Redis or similar)
      // For now, we'll store the chunks as JSON in the database
      const chunksData = {
        chunks: textChunks,
        timestamp: timestamp,
        contentId: content_id
      };
      
      await prisma.metadata.upsert({
        where: { content_id },
        update: {
          audio_summary: chunkedUrl,
          updated_at: new Date()
        },
        create: {
          content_id,
          audio_summary: chunkedUrl,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        message: "Chunked audio prepared successfully",
        data: {
          audioUrl: chunkedUrl,
          summaryText: readableText,
          chunkCount: textChunks.length,
          totalLength: readableText.length,
          isChunked: true,
          rateLimitInfo: {
            requestsPerMinute: TTS_CONFIG.MAX_REQUESTS_PER_MINUTE,
            estimatedTime: `${Math.ceil(textChunks.length * TTS_CONFIG.REQUEST_DELAY / 1000)}s`
          }
        }
      }, { 
        status: 200,
        headers: {
          'X-Rate-Limit-Warning': `This request will make ${textChunks.length} TTS calls. Please be aware of rate limits.`
        }
      });
    }

  } catch (error) {
    console.error("Error in audio generation:", error);
    return NextResponse.json({ 
      message: "Failed to generate audio", 
      error: String(error),
      rateLimitInfo: {
        note: "If you're hitting rate limits, please wait before retrying"
      }
    }, { status: 500 });
  }
}

// Keep the existing POST endpoint for backward compatibility
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateUser(req);
    if (error) return error;

    const body = await req.json();
    const { text, content_id } = body;

    if (!content_id) {
      return NextResponse.json({ message: "Please provide content_id!" }, { status: 400 });
    }

    const hasAccess = await checkContentAccess(user.user_id, content_id);
    if (!hasAccess) {
      return NextResponse.json({ message: "Content not found or not accessible" }, { status: 403 });
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ message: "Please provide valid text!" }, { status: 400 });
    }

    console.log('Direct TTS request for text:', text.substring(0, 100) + '...');

    const processedText = text.substring(0, TTS_CONFIG.MAX_CHUNK_LENGTH);
    
    try {
      const ttsUrl = await generateTTSWithRetry(processedText);
      const timestamp = Date.now();
      const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(ttsUrl)}&format=mp3&_t=${timestamp}`;
      
      await prisma.metadata.upsert({
        where: { content_id },
        update: { 
          audio_summary: proxyUrl,
          summary: processedText,
          updated_at: new Date()
        },
        create: {
          content_id,
          audio_summary: proxyUrl,
          summary: processedText,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      return NextResponse.json({
        message: "Audio generated successfully",
        data: {
          audioUrl: proxyUrl,
          summaryText: processedText,
          originalTtsUrl: ttsUrl
        }
      }, { status: 200 });
    } catch (ttsError) {
      console.error("Error generating audio:", ttsError);
      return NextResponse.json({ 
        message: "Failed to generate audio", 
        error: String(ttsError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in audio generation endpoint:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

