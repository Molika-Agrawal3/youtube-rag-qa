import { NextResponse, connection } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/lib/db";

/**
 * GET /api/health
 * A simple endpoint that reports whether the app can reach the database.
 * Useful while developing, and for uptime checks once deployed.
 */
export async function GET() {
  // Tells Next.js to run this on every request instead of caching the result.
  await connection();

  try {
    await connectToDB();
    return NextResponse.json({
      status: "ok",
      database: mongoose.connection.name,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 500 }
    );
  }
}
