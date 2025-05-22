import { NextRequest } from "next/server";
import { getAudioUrl } from "google-tts-api";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return new Response("No text provided", { status: 400 });

    // Generate TTS URL (mp3)
    const url = getAudioUrl(text, {
      lang: "en",
      slow: false,
      host: "https://translate.google.com",
    });

    // Fetch and stream the audio
    const audioRes = await fetch(url);
    const audioBuffer = await audioRes.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "inline; filename=summary.mp3",
      },
    });
  } catch (e) {
    return new Response("TTS error", { status: 500 });
  }
} 