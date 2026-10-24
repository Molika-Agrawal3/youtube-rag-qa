import { GoogleGenAI } from "@google/genai";

// The embedding size must match the dimension of the Pinecone index (768).
export const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const EMBED_BATCH_SIZE = 50;

let client = null;
export function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Converts texts into embedding vectors (arrays of 768 numbers).
 *
 * taskType tells the model how the text will be used, which improves search:
 *   "RETRIEVAL_DOCUMENT" for the transcript chunks we store
 *   "RETRIEVAL_QUERY"    for the user's question we search with
 */
export async function embedTexts(texts, taskType = "RETRIEVAL_DOCUMENT") {
  const ai = getGenAI();
  const vectors = [];

  // Send texts in batches: one request per batch instead of one per text.
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);

    const response = await withRetry(() =>
      ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: batch,
        config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
      })
    );

    vectors.push(...response.embeddings.map((embedding) => embedding.values));
  }

  return vectors;
}

/**
 * Retries a request a few times if Gemini says we're sending too many
 * requests (HTTP 429) or it's temporarily unavailable (HTTP 503).
 * Waits 2s, then 4s, then 8s ("exponential backoff").
 */
export async function withRetry(fn, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.status ?? error?.code;
      const retryable = status === 429 || status === 503;
      if (!retryable || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}
