import { NextRequest, NextResponse } from "next/server";
import { fetchTranscripts, preprocessTranscript, initializePinecone, upsertChunksToPinecone } from "@/lib/utils";
import { generateEmbeddings } from "@/lib/embedding-utils";

export async function POST(req: NextRequest) {
  try {
    const { video_id } = await req.json();
    if (!video_id) {
      return NextResponse.json({ error: "Missing video_id" }, { status: 400 });
    }
    // 1. Fetch transcript
    const transcript = await fetchTranscripts(video_id);
    if (!transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }
    // 2. Preprocess transcript
    const processedChunks = await preprocessTranscript(transcript);
    // 3. Generate embeddings
    const embeddedChunks = await generateEmbeddings(processedChunks, video_id);
    // 4. Upsert to Pinecone
    const pineconeIndex = await initializePinecone();
    await upsertChunksToPinecone(pineconeIndex, embeddedChunks);
    return NextResponse.json({ success: true, message: "Re-indexed successfully" });
  } catch (error) {
    console.error("Error in reindex-embeddings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 