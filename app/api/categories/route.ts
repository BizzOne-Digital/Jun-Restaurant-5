import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { jsonFromDbError } from "@/lib/api-db-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return NextResponse.json({ categories });
  } catch (e) {
    return jsonFromDbError(e, "Failed to load categories");
  }
}
