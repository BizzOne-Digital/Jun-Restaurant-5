import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashVerificationToken } from "@/lib/email/send-account-verification";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
  }

  await connectDB();
  const hashed = hashVerificationToken(token);
  const now = new Date();

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: now },
  });

  if (!user) {
    return NextResponse.json({ error: "Verification link is invalid or expired" }, { status: 400 });
  }

  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = "";
    user.emailVerificationExpires = null;
    await user.save();
  }

  return NextResponse.json({ ok: true, verified: true });
}
