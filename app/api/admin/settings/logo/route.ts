import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const MAX_BYTES = 2_000_000;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Logo must be PNG, JPG, WebP, or SVG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo file must be under 2 MB." }, { status: 400 });
  }

  const ext = EXT[file.type] ?? path.extname(file.name) ?? ".bin";
  const filename = `logo-${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, filename);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buf);

  /** Browser-reachable path; absolute URL is composed at email-render time. */
  return NextResponse.json({ url: `/uploads/${filename}` });
}
