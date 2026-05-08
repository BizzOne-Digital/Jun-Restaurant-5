import crypto from "crypto";
import { assertPublicSiteUrl } from "@/lib/site-url";
import { sendMailgunEmail } from "@/lib/mailgun";
import { buildAccountVerificationHtml, buildAccountVerificationSubject } from "@/lib/emailTemplates/accountVerification";

export function createEmailVerificationToken(): { rawToken: string; hashedToken: string; expiresAt: Date } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { rawToken, hashedToken, expiresAt };
}

export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function sendAccountVerificationEmail(params: {
  to: string;
  name: string;
  rawToken: string;
}): Promise<void> {
  const base = assertPublicSiteUrl();
  const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(params.rawToken)}`;
  await sendMailgunEmail({
    to: params.to,
    subject: buildAccountVerificationSubject(),
    html: buildAccountVerificationHtml(params.name, verifyUrl),
  });
}
