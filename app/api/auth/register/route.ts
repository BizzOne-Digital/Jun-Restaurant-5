import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { rateLimit } from "@/lib/rate-limit";
import { jsonFromDbError } from "@/lib/api-db-error";
import { hasMinPhoneDigits, suggestEmailTypo } from "@/lib/email-validation";
import { createEmailVerificationToken, sendAccountVerificationEmail } from "@/lib/email/send-account-verification";

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  password: z.string().min(8).max(128),
  phone: z.string().max(40).optional().refine((v) => !v || hasMinPhoneDigits(v), {
    message: "Phone number should contain at least 7 digits",
  }),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const limited = rateLimit(`register:${ip}`, 10, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const suggestion = typeof json?.email === "string" ? suggestEmailTypo(json.email) : null;
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid registration data",
        ...(suggestion ? { emailSuggestion: suggestion } : {}),
      },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const exists = await User.findOne({ email: parsed.data.email });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const { rawToken, hashedToken, expiresAt } = createEmailVerificationToken();
    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      phone: parsed.data.phone ?? "",
      role: "user",
      emailVerified: false,
      emailVerifiedAt: null,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: expiresAt,
    });

    try {
      await sendAccountVerificationEmail({
        to: user.email,
        name: user.name,
        rawToken,
      });
    } catch (mailErr) {
      console.error("Failed to send account verification email", mailErr);
    }

    return NextResponse.json({ ok: true, needsEmailVerification: true });
  } catch (e) {
    return jsonFromDbError(e, "Registration failed");
  }
}
