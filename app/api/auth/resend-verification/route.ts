import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { User } from "@/models/User";
import { createEmailVerificationToken, sendAccountVerificationEmail } from "@/lib/email/send-account-verification";
import { hasValidEmailFormat, suggestEmailTypo } from "@/lib/email-validation";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const session = await getSession();
  const requestedEmail = parsed.data.email?.trim().toLowerCase();
  const email = session?.user?.email?.toLowerCase() || requestedEmail;

  if (!email || !hasValidEmailFormat(email)) {
    const suggestion = email ? suggestEmailTypo(email) : null;
    return NextResponse.json(
      { error: "Please enter a valid email address.", ...(suggestion ? { emailSuggestion: suggestion } : {}) },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    // Avoid user enumeration.
    return NextResponse.json({ ok: true });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const { rawToken, hashedToken, expiresAt } = createEmailVerificationToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expiresAt;
  await user.save();

  try {
    await sendAccountVerificationEmail({
      to: user.email,
      name: user.name,
      rawToken,
    });
  } catch (e) {
    console.error("Failed to resend verification email", e);
    return NextResponse.json({ error: "Unable to send verification email right now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
