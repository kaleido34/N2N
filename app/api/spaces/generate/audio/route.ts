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

// Type guard functions to make TypeScript happy
function isNonNullYouTubeContent(content: YouTubeContent | null | undefined): content is YouTubeContent {
  return content !== null && content !== undefined;
}

function isNonNullDocumentContent(content: DocumentContent | null | undefined): content is DocumentContent {
  return content !== null && content !== undefined;
}

function isNonNullAudioContent(content: AudioContent | null | undefined): content is AudioContent {
  return content !== null && content !== undefined;
}

function isNonNullImageContent(content: ImageContent | null | undefined): content is ImageContent {
  return content !== null && content !== undefined;
}

// Maximum text length for Google TTS in a single request - Google TTS has a ~200 character limit
const MAX_TEXT_LENGTH = 180; // Slightly reduced to be safe

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const content_id = params.get("content_id");

    // Check if force regenerate flag is set
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

    // Check if audio summary already exists in metadata
    const existingMetadata = await prisma.metadata.findUnique({
      where: { content_id: content_id }
    });

    // If audio summary URL already exists and we're not forcing regeneration, return it
    if (existingMetadata?.audio_summary && !forceRegenerate) {
      return NextResponse.json({
        message: "Audio summary found",
        data: {
          audioUrl: existingMetadata.audio_summary,
          summaryText: existingMetadata.summary || "Summary not available"
        }
      }, { status: 200 });
    }

    let readableText = "";

    // First try to get summary from metadata
    if (existingMetadata?.summary) {
      try {
        // Try to parse as JSON first
        const parsedSummary = JSON.parse(existingMetadata.summary);
        
        if (Array.isArray(parsedSummary)) {
          // If it's an array of sections, extract text content
          readableText = parsedSummary.map((section: any) => {
            // Check if section is an object with a content property
            if (section && typeof section === 'object' && 'content' in section) {
              // Handle both null and undefined cases explicitly for TypeScript
              const content = section.content;
              return content !== null && content !== undefined ? String(content) : '';
            }
            return String(section || '');
          }).join('. ');
        } else if (typeof parsedSummary === 'object' && parsedSummary !== null) {
          // If it's an object, try to extract useful text from it
          if ('sections' in parsedSummary && Array.isArray(parsedSummary.sections)) {
            // Format from sections array with explicit null/undefined handling
            readableText = parsedSummary.sections.map((section: any) => {
              if (section && typeof section === 'object' && 'content' in section) {
                // Handle both null and undefined cases explicitly for TypeScript
                const content = section.content;
                return content !== null && content !== undefined ? String(content) : '';
              }
              return String(section || '');
            }).join('. ');
          } else {
            // Try to extract any meaningful text properties
            const textParts = [];
            for (const key in parsedSummary) {
              // Only include string values and convert simple values to strings
              if (typeof parsedSummary[key] === 'string') {
                textParts.push(parsedSummary[key]);
              } else if (typeof parsedSummary[key] === 'number' || typeof parsedSummary[key] === 'boolean') {
                textParts.push(String(parsedSummary[key]));
              } else if (parsedSummary[key] !== null && typeof parsedSummary[key] === 'object') {
                // For objects, try to stringify them properly or skip if they can't be stringified
                try {
                  const objString = JSON.stringify(parsedSummary[key]);
                  // Only include if it's a meaningful string (not just an empty object)
                  if (objString && objString !== '{}' && objString !== '[]') {
                    textParts.push(`${key}: ${objString}`);
                  }
                } catch (e) {
                  // `Failed to stringify property ${key}`, e);
                }
              }
            }
            
            if (textParts.length > 0) {
              readableText = textParts.join('. ');
            } else {
              // Fallback to a simple description if we can't extract text
              readableText = "Summary of the content you requested.";
            }
            
            // Additional safety check for object references
            if (readableText.includes('[object Object]')) {
              // 'Detected [object Object] in processed text, cleaning up');
              readableText = readableText.replace(/\[object Object\]/g, 'content');
            }
          }
        } else {
          // If it's a primitive value, convert to string
          readableText = String(parsedSummary);
        }
      } catch (jsonError) {
        // If it's not JSON, use the string directly
        // 'Error parsing summary as JSON, using raw string:', jsonError);
        readableText = existingMetadata.summary;
      }
    }

    // Validate that we have proper readable text
    if (!readableText || typeof readableText !== 'string' || readableText.includes('[object Object]')) {
      // 'Summary text was invalid, falling back to content title');
      
      // If no valid summary, get title from content based on content type
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
      
      // TypeScript doesn't understand the null check above, so we need to assert the type
      const content = contentResult as Content;

      // Get title based on content type
      switch (content.content_type) {
        case "YOUTUBE_CONTENT": {
          // Use optional chaining and nullish coalescing to safely access properties
          const title = content.youtubeContent?.title;
          if (title) {
            readableText = `Summary of ${String(title)}`;
          }
          break;
        }
          
        case "DOCUMENT_CONTENT": {
          // Use optional chaining and nullish coalescing to safely access properties
          const filename = content.documentContent?.filename;
          if (filename) {
            readableText = `Summary of document ${String(filename)}`;
          }
          break;
        }
          
        case "AUDIO_CONTENT": {
          // Use optional chaining and nullish coalescing to safely access properties
          const title = content.audioContent?.title;
          if (title) {
            readableText = `Summary of audio ${String(title)}`;
          }
          break;
        }
          
        case "IMAGE_CONTENT": {
          // Use optional chaining and nullish coalescing to safely access properties
          const title = content.imageContent?.title;
          if (title) {
            readableText = `Summary of image ${String(title)}`;
          }
          break;
        }
          
        default:
          readableText = `Summary of content ${content_id}`;
      }
      
      // Make sure we have some text
      if (!readableText || readableText.length < 10) {
        readableText = "This is a summary of your content.";
      }
      
      // Log the processed text
      // 'Processed summary text:', readableText);
    }

    // Check if readableText is an object and safely stringify it
    if (typeof readableText === 'object' && readableText !== null) {
      // 'WARNING: readableText is an object, converting to JSON string:', readableText);
      try {
        // Convert object to a proper string representation
        readableText = JSON.stringify(readableText);
      } catch (stringifyError) {
        // 'Failed to stringify object:', stringifyError);
        readableText = "Summary of your content. Unable to process original format.";
      }
    }

    // Final fallback if we still don't have valid text
    if (!readableText || readableText.trim() === "" || readableText.includes('[object Object]')) {
      readableText = "Summary of your content. Thank you for using our system.";
    }
    
    // 'Final processed text for TTS:', readableText);
    
    // Truncate text if needed
    if (readableText.length > MAX_TEXT_LENGTH) {
      // `Truncating text from ${readableText.length} to ${MAX_TEXT_LENGTH} characters`);
      readableText = readableText.substring(0, MAX_TEXT_LENGTH);
    }

    try {
      // Generate TTS URL with multiple options to enhance reliability
      let audioUrl: string = ''; // Initialize with empty string to prevent 'used before assigned' error
      // Default to a descriptive fallback TTS URL
      const timestamp = Date.now(); // Add timestamp to prevent caching
      let proxyUrl = `/api/proxy/audio?url=https://translate.google.com/translate_tts?ie=UTF-8&q=Summary+not+available+at+this+time&tl=en&total=1&idx=0&textlen=30&client=tw-ob&prev=input&ttsspeed=1&_=${timestamp}&format=mp3`;
      
      // 'Processed readable text:', readableText.substring(0, 100) + '...');
      
      try {
        // Before sending to Google TTS, do a final validation of the text
        if (typeof readableText !== 'string') {
          // 'readableText is not a string:', typeof readableText, readableText);
          readableText = 'Summary unavailable at this time';
        }
        
        // Ensure the text doesn't contain any object references
        if (readableText.includes('[object Object]') || readableText.includes('Object]') || readableText.includes('[object')) {
          // 'Text contains object reference, cleaning up:', readableText);
          readableText = readableText.replace(/\[object Object\]/g, 'content').replace(/\[object.*?\]/g, 'content');
        }
        
        // 'Final clean text being sent to TTS:', readableText);
        
        // Get only the first 200 characters to avoid issues with long text
        const ttsText = typeof readableText === 'string' 
          ? readableText.substring(0, 200) 
          : 'Summary of content';
        
        // Ensure we're sending a clean string to the TTS API
        // Double-check for any object references and remove them
        let sanitizedText = ttsText
          .replace(/\[object Object\]/g, 'content')
          .replace(/\[object .*?\]/g, 'content')
          .replace(/undefined/g, '')
          .replace(/null/g, '');
          
        // 'Sanitized TTS text:', sanitizedText);
        
        // Make sure we have meaningful text to convert to speech
        if (!sanitizedText || sanitizedText.trim().length < 5) {
          // 'Text too short for TTS, using default message');
          sanitizedText = 'Summary of your content is ready. Thank you for using our system.';
        }
        
        // Remove any excessive whitespace, line breaks, etc.
        sanitizedText = sanitizedText.trim()
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ')
          .replace(/\t+/g, ' ');
          
        // Make sure we're not exceeding Google TTS limits (usually ~200 chars)
        if (sanitizedText.length > 180) {
          sanitizedText = sanitizedText.substring(0, 180) + '...';
        }
        
        // Log the exact text we're sending to TTS
        // 'FINAL TEXT BEING SENT TO TTS:', sanitizedText);
        
        try {
          // Instead of using the library's getAudioUrl, let's create a direct TTS URL
          // This ensures we're using exactly the parameters we want
          const encodedText = encodeURIComponent(sanitizedText);
          // Create a Google TTS URL directly
          audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&total=1&idx=0&textlen=${sanitizedText.length}&client=tw-ob&prev=input&ttsspeed=1`;
          
          // 'Direct Google TTS URL created:', audioUrl.substring(0, 100) + '...');
          
          // Ensure we have a string URL, not an object
          if (typeof audioUrl !== 'string') {
            // 'Unexpected TTS URL type:', typeof audioUrl);
            throw new Error('Invalid Google TTS URL: not a string');
          }
          
          // Check for potential object string representation
          if (audioUrl.includes('[object Object]') || audioUrl.includes('%5Bobject%20Object%5D')) {
            // 'Generated URL contains [object Object], cannot use:', audioUrl);
            throw new Error('Invalid TTS URL contains object reference');
          }
          
          // If we got this far, we have a valid TTS URL, so update the proxy URL
          const encodedUrl = encodeURIComponent(audioUrl);
          proxyUrl = `/api/proxy/audio?url=${encodedUrl}&format=mp3&_t=${timestamp}`;
          // 'Successfully created TTS URL and updated proxy URL');
        } catch (ttsError) {
          // 'Error generating TTS URL, using fallback:', ttsError);
          // Keep using the fallback URL defined earlier
        }
        
        // Log the resulting audio URL to verify it's properly formatted
        // 'Generated Google TTS URL:', audioUrl.substring(0, 150) + '...');
        
        // Double-check the URL is valid
        try {
          new URL(audioUrl);
        } catch (urlError) {
          // 'Invalid URL format:', audioUrl, urlError);
          throw new Error('Invalid URL format from Google TTS');
        }
        
        // We've already set the proxyUrl in the TTS generation block if it was successful
        // This code only runs if we didn't already set the proxyUrl but somehow made it past the TTS generation
        if (!proxyUrl.includes(encodeURIComponent(audioUrl))) {
          // Properly encode the URL to ensure it works with special characters
          const encodedUrl = encodeURIComponent(audioUrl);
          // Add format parameter to ensure proper content type handling
          proxyUrl = `/api/proxy/audio?url=${encodedUrl}&format=mp3&_t=${timestamp}`;
          // 'Updated proxy URL as a fallback:', proxyUrl);
        }
        
        // 'Created proxy URL:', proxyUrl);
      } catch (error: any) { // Type assertion for the error
        // 'Failed to generate TTS URL:', error);
        // 'Using fallback audio URL:', proxyUrl);
        // We'll continue with the fallback URL instead of throwing
      }
      
      // Store the audio URL and processed text in metadata
      await prisma.metadata.upsert({
        where: {
          content_id: content_id
        },
        update: {
          audio_summary: proxyUrl,
          summary: readableText,
          updated_at: new Date()
        },
        create: {
          content_id: content_id,
          audio_summary: proxyUrl,
          summary: readableText,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // Return the proxy URL and processed summary text
      return NextResponse.json({
        message: "Audio generated successfully",
        data: {
          audioUrl: proxyUrl,
          summaryText: readableText, // Send the processed text that was used for TTS
          originalTtsUrl: audioUrl // For debugging purposes
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (error) {
      // "Error generating audio:", error);
      return NextResponse.json({ 
        message: "Failed to generate audio", 
        error: String(error) 
      }, { status: 500 });
    }
  } catch (error) {
    // "Error in audio generation endpoint:", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user
    const { user, error } = await authenticateUser(req);
    if (error) return error;

    // Parse request body
    const body = await req.json();
    const { text, content_id } = body;

    // Input validation
    if (!content_id) {
      return NextResponse.json(
        { message: "Please provide content_id!" },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { message: "No text provided for audio generation" },
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

    // Truncate text if needed
    const processedText = text.substring(0, MAX_TEXT_LENGTH);
    // 'Using text for TTS generation:', processedText.substring(0, 100) + '...');

    try {
      // Generate TTS URL with improved options
      const audioUrl = await googleTTS(processedText, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com'
      });
      
      // Create a proxy URL to avoid CORS issues
      const encodedUrl = encodeURIComponent(audioUrl);
      const proxyUrl = `/api/proxy/audio?url=${encodedUrl}`;
      
      // 'Created proxy URL for audio');
      
      // Store the audio URL in metadata using upsert
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
      
      // Return the audio URL and processed text
      return NextResponse.json({
        message: "Audio generated successfully",
        data: {
          audioUrl: proxyUrl,
          summaryText: processedText,
          originalTtsUrl: audioUrl // For debugging purposes
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (ttsError) {
      // "Error generating audio:", ttsError);
      return NextResponse.json({ 
        message: "Failed to generate audio", 
        error: String(ttsError) 
      }, { status: 500 });
    }
  } catch (error) {
    // "Error in audio generation endpoint:", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

