import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/db";
import Chat from "@/models/Chat";
import { extractVideoId, fetchTranscript, TranscriptUnavailableError } from "@/lib/youtube";
import { chunkSegments } from "@/lib/chunking";
import { embedTexts } from "@/lib/gemini";
import { getIndex, chunkVectorId } from "@/lib/pinecone";

const UPSERT_BATCH_SIZE = 100;

/**
 * POST /api/ingest   body: { "url": "<YouTube link>" }
 *
 * The ingestion pipeline:
 *   1. Normalize the link to a video ID
 *   2. If this video is already in Pinecone, skip straight to step 6
 *   3. Fetch the transcript from YouTube
 *   4. Group caption lines into overlapping chunks
 *   5. Embed each chunk with Gemini and store the vectors in Pinecone
 *   6. Make sure this user has a Chat for the video (it appears in history)
 */
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  // 1. Normalize
  const videoId = extractVideoId(body?.url);
  if (!videoId) {
    return NextResponse.json({ error: "That doesn't look like a YouTube video link." }, { status: 400 });
  }

  try {
    const index = getIndex();

    // 2. Already ingested? Fetch the first chunk by its known ID.
    const firstChunkId = chunkVectorId(videoId, 0);
    const existing = await index.fetch({ ids: [firstChunkId] });
    const firstChunk = existing.records?.[firstChunkId];

    let videoTitle;
    let channelName;
    let chunkCount = null;
    let alreadyIngested = false;

    if (firstChunk) {
      alreadyIngested = true;
      videoTitle = firstChunk.metadata?.videoTitle;
      channelName = firstChunk.metadata?.channelName;
    } else {
      // 3. Fetch transcript
      const video = await fetchTranscript(videoId);
      videoTitle = video.title;
      channelName = video.channelName;

      // 4. Chunk
      const chunks = chunkSegments(video.segments);
      chunkCount = chunks.length;

      // 5. Embed + store
      const vectors = await embedTexts(chunks.map((chunk) => chunk.text), "RETRIEVAL_DOCUMENT");

      const records = chunks.map((chunk, i) => ({
        id: chunkVectorId(videoId, i),
        values: vectors[i],
        metadata: {
          videoId,
          videoTitle,
          channelName,
          text: chunk.text,
          startSeconds: chunk.startSeconds,
          chunkIndex: i,
        },
      }));

      for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
        await index.upsert({ records: records.slice(i, i + UPSERT_BATCH_SIZE) });
      }
    }

    // 6. Create this user's chat for the video if it doesn't exist yet.
    await connectToDB();
    await Chat.findOneAndUpdate(
      { userId: session.user.id, videoId },
      { $setOnInsert: { videoTitle, channelName } },
      { upsert: true }
    );

    return NextResponse.json({ videoId, videoTitle, channelName, chunkCount, alreadyIngested });
  } catch (error) {
    if (error instanceof TranscriptUnavailableError) {
      console.warn("Transcript unavailable:", error.message, error.cause ?? "");
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Ingestion failed:", error);
    return NextResponse.json({ error: "Failed to process this video. Please try again." }, { status: 500 });
  }
}
