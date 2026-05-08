import crypto from "crypto";

export function checkoutEmailVerificationRequired(): boolean {
  return process.env.REQUIRE_CHECKOUT_EMAIL_VERIFICATION === "true";
}

export function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}
