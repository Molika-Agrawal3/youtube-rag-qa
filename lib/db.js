import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Next.js can run this file many times (hot reload in development, many
 * requests in production). Opening a new database connection every time
 * would quickly exhaust MongoDB's connection limit, so we cache ONE
 * connection on `globalThis`, which survives hot reloads.
 */
let cached = globalThis._mongoose;
if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export async function connectToDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  // 1. Already connected: reuse the connection.
  if (cached.conn) return cached.conn;

  // 2. Not connected yet: start connecting (only once, even if several
  //    requests arrive at the same moment, they all wait on the same promise).
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "youtube_rag_qa",
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Connection failed: clear the promise so the next request can retry.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
