import { Pinecone } from "@pinecone-database/pinecone";

let client = null;

/** Returns the Pinecone index that stores our transcript chunks. */
export function getIndex() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not set. Add it to .env.local");
  }
  if (!client) {
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return client.index(process.env.PINECONE_INDEX_NAME || "youtube-rag-qa");
}

/**
 * Vector IDs are deterministic: "<videoId>#<chunkNumber>".
 * Ingesting the same video twice overwrites the same IDs instead of creating
 * duplicates, and we can check "is this video already stored?" by looking
 * up its first chunk.
 */
export function chunkVectorId(videoId, chunkIndex) {
  return `${videoId}#${chunkIndex}`;
}
