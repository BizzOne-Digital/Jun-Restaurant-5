import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin-guard";
import { MenuItem } from "@/models/MenuItem";
import { slugify } from "@/lib/slug";
import { allocateUniqueMenuSlug } from "@/lib/menu-slug";
import { jsonFromDbError } from "@/lib/api-db-error";

const PatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    price: z.number().positive().optional(),
    category: z.string().optional(),
    image: z.string().max(2000).optional(),
    ingredients: z.array(z.string()).optional(),
    badges: z.array(z.string()).optional(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isPopular: z.boolean().optional(),
    isSpicy: z.boolean().optional(),
    isVegetarian: z.boolean().optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await connectDB();
  const item = await MenuItem.findById(ctx.params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = parsed.data;
  if (data.name !== undefined) {
    item.name = data.name;
    const base = slugify(data.name);
    item.slug = await allocateUniqueMenuSlug(base, { excludeItemId: ctx.params.id });
  }
  if (data.description !== undefined) item.description = data.description;
  if (data.price !== undefined) item.price = data.price;
  if (data.category !== undefined) item.category = data.category as unknown as typeof item.category;
  if (data.image !== undefined) item.image = data.image;
  if (data.ingredients !== undefined) item.ingredients = data.ingredients;
  if (data.badges !== undefined) item.badges = data.badges;
  if (data.isAvailable !== undefined) item.isAvailable = data.isAvailable;
  if (data.isFeatured !== undefined) item.isFeatured = data.isFeatured;
  if (data.isPopular !== undefined) item.isPopular = data.isPopular;
  if (data.isSpicy !== undefined) item.isSpicy = data.isSpicy;
  if (data.isVegetarian !== undefined) item.isVegetarian = data.isVegetarian;

  try {
    await item.save();
  } catch (e) {
    return jsonFromDbError(e, "Failed to save menu item");
  }
  const populated = await item.populate("category", "name slug");
  return NextResponse.json({ item: populated });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  await connectDB();
  await MenuItem.findByIdAndDelete(ctx.params.id);
  return NextResponse.json({ ok: true });
}
