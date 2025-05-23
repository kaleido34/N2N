import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchTranscripts, preprocessTranscript, initializePinecone, upsertChunksToPinecone } from "@/lib/utils";
import { generateEmbeddings } from "@/lib/embedding-utils";

export async function POST() {
  try {
    // 1. Get all YouTube video IDs from the database
    const allVideos = await prisma.youtubeContent.findMany({ select: { youtube_id: true } });
    const pineconeIndex = await initializePinecone();
    const results = [];
    for (const { youtube_id } of allVideos) {
      try {
        const transcript = await fetchTranscripts(youtube_id);
        if (!transcript) {
          results.push({ video_id: youtube_id, status: "Transcript not found" });
          continue;
        }
        const processedChunks = await preprocessTranscript(transcript);
        const embeddedChunks = await generateEmbeddings(processedChunks, youtube_id);
        await upsertChunksToPinecone(pineconeIndex, embeddedChunks);
        results.push({ video_id: youtube_id, status: "Re-indexed successfully" });
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