import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { CheckoutEmailVerification } from "@/models/CheckoutEmailVerification";
import { hashCode } from "@/lib/checkout/email-verification";

const BodySchema = z.object({
  verificationId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
  }

  await connectDB();
  const record = await CheckoutEmailVerification.findById(parsed.data.verificationId);
  if (!record) {
    return NextResponse.json({ error: "Verification code expired. Please request a new one." }, { status: 400 });
  }
  if (record.verified) {
    return NextResponse.json({ ok: true, verified: true, verificationId: record._id.toString() });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Verification code expired. Please request a new one." }, { status: 400 });
  }
  if ((record.attempts ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
  }

  const incomingHash = hashCode(parsed.data.code);
  if (incomingHash !== record.codeHash) {
    record.attempts = (record.attempts ?? 0) + 1;
    await record.save();
    return NextResponse.json({ error: "This email is not verified. Please check your inbox for the verification code." }, { status: 400 });
  }

  record.verified = true;
  record.verifiedAt = new Date();
  await record.save();

  return NextResponse.json({ ok: true, verified: true, verificationId: record._id.toString() });
}
