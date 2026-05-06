import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { Category } from "@/models/Category";
import { jsonFromDbError } from "@/lib/api-db-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const categorySlug = searchParams.get("category")?.toLowerCase();
    const search = searchParams.get("search")?.trim();
    const filters = (searchParams.get("filter") || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const query: Record<string, unknown> = { isAvailable: true };
    const andClauses: Record<string, unknown>[] = [];

    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug, isActive: true }).lean<{ _id: Types.ObjectId } | null>();
      if (cat) {
        if (categorySlug === "ono-signatures") {
          andClauses.push({
            $or: [
              { category: cat._id },
              {
                slug: {
                  $in: [
                    "spicy-salmon-seaweed-bowl",
                    "ono-torched-salmon",
                    "ono-torched-ahi-tuna",
                    "big-island-one-size",
                    "classic-salmon",
                    "spicy-mango-salmon",
                    "spicy-tuna-bowl",
                    "chicken-and-crabmeat-bowl",
                  ],
                },
              },
            ],
          });
        } else {
          andClauses.push({ category: cat._id });
        }
      }
    }

    if (search) {
      andClauses.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (andClauses.length) {
      query.$and = andClauses;
    }

    const items = await MenuItem.find(query)
      .populate("category", "name slug")
      .sort({ isFeatured: -1, isPopular: -1, name: 1 })
      .lean();

    const filtered = items.filter((item) => {
      if (!filters.length) return true;
      return filters.every((f) => {
        if (f === "popular") return item.isPopular;
        if (f === "spicy") return item.isSpicy;
        if (f === "vegetarian") return item.isVegetarian;
        if (f === "salmon")
          return /salmon/i.test(item.name) || /salmon/i.test(item.description || "");
        if (f === "tuna") return /tuna|ahi/i.test(item.name) || /tuna|ahi/i.test(item.description || "");
        if (f === "chicken") return /chicken/i.test(item.name) || /chicken/i.test(item.description || "");
        if (f === "steak") return /steak|saikoro/i.test(item.name + (item.description || ""));
        if (f === "tofu") return /tofu/i.test(item.name + (item.description || ""));
        return true;
      });
    });

    return NextResponse.json({ items: filtered });
  } catch (e) {
    return jsonFromDbError(e, "Failed to load menu");
  }
}
