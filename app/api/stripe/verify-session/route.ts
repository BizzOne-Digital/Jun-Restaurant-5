import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import { getStripe } from "@/lib/stripe";
import { StripeSetupError } from "@/lib/stripe-env";
import { Order } from "@/models/Order";
import { Promotion } from "@/models/Promotion";
import { sendPaidOrderEmails } from "@/lib/email/send-order-emails";

export const runtime = "nodejs";

/**
 * Client has chosen not to use Stripe webhooks. This route verifies payment after Stripe success redirect.
 * Note: if the customer completes payment but does not return to the site, order status/email updates may be delayed or missed.
 * Webhooks are recommended for production reliability.
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const sessionId = typeof json?.session_id === "string" ? json.session_id.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    if (e instanceof StripeSetupError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    const paymentIntent =
      typeof session.payment_intent === "string" ? null : session.payment_intent;
    // Card number / expiry / CVC / 3DS are validated by Stripe Checkout itself.
    // Our app only trusts Stripe's final payment status from server-side session retrieval.
    const isPaid =
      session.payment_status === "paid" || paymentIntent?.status === "succeeded";

    const orderId = session.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Session metadata is missing orderId" }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || "";

    order.stripeCheckoutSessionId = session.id;
    order.stripePaymentIntentId = paymentIntentId;
    order.orderType = "pickup";
    order.servingMode = "in_store_pickup";
    order.deliveryFee = 0;
    order.deliveryAddress = null;

    if (!isPaid) {
      await order.save();
      const declineCode = paymentIntent?.last_payment_error?.decline_code || "";
      const paymentErrorMessage =
        declineCode === "card_declined"
          ? "Your card was declined by Stripe. Please use a different card."
          : "Payment failed. Please check your card details or try another card.";
      return NextResponse.json({
        success: false,
        paymentStatus: order.paymentStatus,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        error: "Payment could not be confirmed.",
        paymentErrorMessage,
      });
    }

    const wasPaid = order.paymentStatus === "paid";
    if (!wasPaid) {
      order.paymentStatus = "paid";
      if (!["preparing", "ready", "completed", "cancelled", "refunded"].includes(order.orderStatus)) {
        order.orderStatus = "paid";
      }
      await order.save();
      if (order.promoCode) {
        await Promotion.updateOne({ code: order.promoCode }, { $inc: { usedCount: 1 } });
      }
    } else {
      await order.save();
    }

    const sendCustomer = process.env.ORDER_SEND_CUSTOMER_CONFIRMATION !== "false";
    const customerDone = !sendCustomer || Boolean(order.confirmationEmailSent);
    const merchantDone = Boolean(order.merchantNotificationEmailSent);
    if (!(customerDone && merchantDone)) {
      try {
        await sendPaidOrderEmails(order, {
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId || undefined,
        });
      } catch (mailErr) {
        console.error("sendPaidOrderEmails failed after payment", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      paymentStatus: "paid",
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
    });
  } catch (e) {
    console.error("verify-session failed", e);
    return NextResponse.json({ error: "Unable to verify session" }, { status: 500 });
  }
}
