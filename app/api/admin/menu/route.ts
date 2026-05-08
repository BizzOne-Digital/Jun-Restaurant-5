import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin-guard";
import { MenuItem } from "@/models/MenuItem";
import { slugify } from "@/lib/slug";
import { allocateUniqueMenuSlug } from "@/lib/menu-slug";

const PostSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  price: z.number().positive(),
  category: z.string().min(1),
  image: z.string().max(2000).optional().default(""),
  ingredients: z.array(z.string()).optional().default([]),
  badges: z.array(z.string()).optional().default([]),
  isAvailable: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  isPopular: z.boolean().optional().default(false),
  isSpicy: z.boolean().optional().default(false),
  isVegetarian: z.boolean().optional().default(false),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  await connectDB();
  const items = await MenuItem.find().populate("category", "name slug").sort({ name: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const json = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid menu item" }, { status: 400 });
  }

  await connectDB();
  const base = slugify(parsed.data.name);
  const slug = await allocateUniqueMenuSlug(base);

  const item = await MenuItem.create({
    ...parsed.data,
    slug,
    category: parsed.data.category,
  });

  const populated = await item.populate("category", "name slug");
  return NextResponse.json({ item: populated });
}
