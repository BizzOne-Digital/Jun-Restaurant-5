import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { sendMailgunEmail } from "@/lib/mailgun";
import { CheckoutEmailVerification } from "@/models/CheckoutEmailVerification";
import { generateSixDigitCode, hashCode } from "@/lib/checkout/email-verification";
import { hasValidEmailFormat, suggestEmailTypo } from "@/lib/email-validation";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email;
  if (!hasValidEmailFormat(email)) {
    const suggestion = suggestEmailTypo(email);
    return NextResponse.json(
      { error: "Please enter a valid email address.", ...(suggestion ? { emailSuggestion: suggestion } : {}) },
      { status: 400 }
    );
  }

  const code = generateSixDigitCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await connectDB();
  const doc = await CheckoutEmailVerification.create({
    email,
    codeHash,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  try {
    await sendMailgunEmail({
      to: email,
      subject: "Your ONO Poké Bar checkout verification code",
      html: `<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
      text: `Your ONO Poké Bar checkout verification code is ${code}. It expires in 10 minutes.`,
    });
  } catch (e) {
    console.error("Checkout email code send failed", e);
    return NextResponse.json({ error: "Unable to send verification code right now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verificationId: doc._id.toString() });
}
