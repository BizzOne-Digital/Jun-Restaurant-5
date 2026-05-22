import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin-guard";
import { SiteSetting } from "@/models/SiteSetting";

const PatchSchema = z.object({
  restaurantName: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(400).optional(),
  phone: z.string().max(80).optional(),
  email: z.string().email().max(200).optional(),
  openingHours: z.string().max(1000).optional(),
  logo: z.string().max(2000).optional(),
  heroImages: z.array(z.string()).optional(),
  pickupPrepareTimeMinutes: z.coerce.number().int().min(1).max(240).optional(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  await connectDB();
  const settings = await SiteSetting.findOne().sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ settings: settings ?? {} });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  await connectDB();
  let doc = await SiteSetting.findOne().sort({ updatedAt: -1 });
  if (!doc) {
    doc = await SiteSetting.create({
      restaurantName: "ONO Poké Bar",
      address: "369 Mountainview Rd S #5, Georgetown, ON L7G 5X3",
      phone: "",
      email: "",
      openingHours: "",
      socialLinks: {},
      logo: "/images/logo.png",
      heroImages: [],
      pickupPrepareTimeMinutes: 20,
    });
  }

  Object.assign(doc, parsed.data);
  await doc.save();
  return NextResponse.json({ settings: doc });
}
