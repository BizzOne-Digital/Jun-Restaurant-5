import { NextResponse } from "next/server";
import { checkoutEmailVerificationRequired } from "@/lib/checkout/email-verification";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ required: checkoutEmailVerificationRequired() });
}
