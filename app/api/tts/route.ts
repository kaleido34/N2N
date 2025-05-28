import { NextRequest } from "next/server";
// Import for old google-tts-api version 0.0.6
const googleTTS = require('google-tts-api');

// Maximum text length for Google TTS in a single request (actual limit is around 200 chars)
const MAX_TEXT_LENGTH = 200;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response("No text provided", { status: 400 });
    }

    try {
      console.log('Processing TTS request for text:', text.substring(0, 50) + '...');
      
      // For version 0.0.6, googleTTS is a function that returns a Promise with a URL
      const url = await googleTTS(text.substring(0, MAX_TEXT_LENGTH), 'en', 1); // 1 is normal speed
      
      console.log('TTS URL generated:', url.substring(0, 50) + '...');
      
      // Fetch the audio from the generated URL
      const audioRes = await fetch(url, {
        signal: AbortSignal.timeout(10000) // 10 seconds timeout
      });
      
      if (!audioRes.ok) {
        console.error(`Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`);
        return new Response(JSON.stringify({ error: `Audio fetch failed: ${audioRes.status}` }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log('Audio fetched successfully, returning response');
      const audioBuffer = await audioRes.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": "inline; filename=summary.mp3"
        }
      });
    } catch (fetchError) {
      console.error("Error fetching audio:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch audio", details: String(fetchError) }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(JSON.stringify({ error: "TTS processing error", details: String(e) }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}