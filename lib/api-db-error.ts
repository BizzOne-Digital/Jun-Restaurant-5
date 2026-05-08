import { NextResponse } from "next/server";

/** Map DB / env failures to a clear JSON response for the browser */
export function jsonFromDbError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : String(e);

  if (msg.includes("MONGODB_URI is not set")) {
    return NextResponse.json(
      {
        error: "Database is not configured",
        hint: "Add MONGODB_URI to .env.local (see .env.example), restart npm run dev, start MongoDB, then run npm run seed.",
      },
      { status: 503 }
    );
  }

  if (msg.includes("E11000") || msg.includes("duplicate key")) {
    return NextResponse.json(
      {
        error: "That value conflicts with another menu record (duplicate slug or unique field). Try a slightly different name.",
      },
      { status: 409 }
    );
  }

  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("querySrv") ||
    msg.includes("MongoServerSelectionError") ||
    msg.includes("getaddrinfo")
  ) {
    return NextResponse.json(
      {
        error: "Cannot connect to MongoDB",
        hint: "Start MongoDB (Windows: Services → MongoDB), or run: docker compose up -d. In Compass use mongodb://127.0.0.1:27017",
      },
      { status: 503 }
    );
  }

  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
