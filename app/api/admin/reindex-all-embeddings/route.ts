
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchTranscripts, preprocessTranscript, initializePinecone, upsertChunksToPinecone } from "@/lib/utils";

export async function POST() {
  try {
    // 1. Get all YouTube video IDs from the database
    const allVideos = await prisma.youtubeContent.findMany({ select: { youtube_id: true } });
    const results = [];
    for (const { youtube_id } of allVideos) {
      try {
        const transcript = await fetchTranscripts(youtube_id);
        if (!transcript) {
          results.push({ video_id: youtube_id, status: "Transcript not found" });
          continue;
        }
        const processedChunks = await preprocessTranscript(transcript);
        results.push({ video_id: youtube_id, status: "Re-indexed (embeddings removed)" });
      } catch (err) {
        results.push({ video_id: youtube_id, status: `Error: ${err instanceof Error ? err.message : String(err)}` });
      }
    }
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Error in reindex-all-embeddings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}