import { NextRequest } from "next/server";

// Function to detect if a URL contains object references
function containsObjectReference(url: string): boolean {
  return url.includes('%5Bobject') || url.includes('[object') || url.includes('Object%5D') || url.includes('Object]');
}

// Helper function to fetch and proxy audio
async function fetchAndProxyAudio(url: string): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
      },
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        message: "Failed to fetch audio", 
        status: response.status,
        statusText: response.statusText 
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const contentType = response.headers.get('Content-Type');
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType || "audio/mpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      message: "Error fetching audio", 
      error: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get URL parameter
    const url = req.nextUrl.searchParams.get("url");
    
    if (!url) {
      return new Response(JSON.stringify({ message: "Missing url param" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if URL contains object references - this is likely an error but we'll try to use it anyway
    if (containsObjectReference(url)) {
      // Continue anyway
    }
    
    // Validate URL format (basic check)
    try {
      new URL(url);
    } catch (e) {
      return new Response(JSON.stringify({ message: "Invalid URL format" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch the audio from Google TTS with more detailed error handling
    const response = await fetch(url, {
      headers: {
        // Google TTS expects a browser-like user agent
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
      },
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        message: "Failed to fetch audio from Google TTS", 
        status: response.status,
        statusText: response.statusText 
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get format parameter if provided by client
    const requestedFormat = req.nextUrl.searchParams.get("format");
    
    // Check content type from response
    let contentType = response.headers.get('Content-Type');
    console.log('Original audio content type:', contentType);
    
    // Force specific content type if format parameter is provided
    if (requestedFormat) {
      switch(requestedFormat.toLowerCase()) {
        case 'mp3':
          contentType = 'audio/mpeg';
          break;
        case 'wav':
          contentType = 'audio/wav';
          break;
        case 'ogg':
          contentType = 'audio/ogg';
          break;
        case 'aac':
          contentType = 'audio/aac';
          break;
      }
      console.log('Overriding content type to:', contentType, 'based on requested format:', requestedFormat);
    }
    
    // Ensure we have a valid content type, defaulting to MP3
    if (!contentType || contentType === 'application/octet-stream') {
      contentType = 'audio/mpeg';
      console.log('Using default content type:', contentType);
    }
    
    // Stream the audio back with correct headers
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Accept-Ranges": "bytes", // Support for range requests (important for seeking)
      },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ 
      message: "Internal server error", 
      error: err instanceof Error ? err.message : String(err) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
