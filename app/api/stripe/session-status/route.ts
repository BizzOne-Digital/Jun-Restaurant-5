import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStripe } from "@/lib/stripe";
import { StripeSetupError } from "@/lib/stripe-env";
import { Order, type OrderDoc } from "@/models/Order";
export const runtime = "nodejs";

/** Safe subset for the payment-success page — no raw Stripe objects */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const orderId = session.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    await connectDB();
    const order = (await Order.findById(orderId).lean()) as OrderDoc | null | undefined;
    if (!order || Array.isArray(order)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent && typeof session.payment_intent !== "string"
          ? session.payment_intent.id
          : undefined;

    /** Read-only for this route — marking paid + emails are handled only by the Stripe webhook. */
    return NextResponse.json({
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      currency: session.currency,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: piId ?? null,
      customer_email:
        session.customer_details?.email || session.customer_email || order.customerEmail,
      metadata: session.metadata ?? {},
      order: {
        orderNumber: order.orderNumber,
        total: order.total,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
        servingMode: order.servingMode ?? "in_store_pickup",
        customerName: order.customerName,
        items: order.items?.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        notes: order.notes,
        restaurantOrderEmailSent: order.restaurantOrderEmailSent,
        merchantNotificationEmailSent: order.merchantNotificationEmailSent,
      },
    });
  } catch (e) {
    if (e instanceof StripeSetupError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Unable to load session" }, { status: 500 });
  }
}
