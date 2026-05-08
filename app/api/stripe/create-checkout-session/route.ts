import { NextResponse } from "next/server";
import { CheckoutBodySchema, createStripeCheckoutSession, StripeSetupError } from "@/lib/checkout/create-stripe-checkout-session";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { checkoutValidationErrorBody } from "@/lib/checkout/request-errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const limited = rateLimit(`stripe-checkout:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CheckoutBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(checkoutValidationErrorBody(parsed.error, json), { status: 400 });
  }

  try {
    const session = await getSession();
    const userId = session?.user?.id ?? null;
    const { url, orderId } = await createStripeCheckoutSession(parsed.data, userId);
    return NextResponse.json({ url, orderId });
  } catch (e) {
    if (e instanceof StripeSetupError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const message = e instanceof Error ? e.message : "Checkout failed";
    const status = message.includes("not configured") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
