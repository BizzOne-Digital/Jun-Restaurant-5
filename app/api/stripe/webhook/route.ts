import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sendPaidOrderEmails } from "@/lib/email/send-order-emails";
import { getStripe } from "@/lib/stripe";
import { assertStripeWebhookSecretOptional, StripeSetupError } from "@/lib/stripe-env";
import { Order } from "@/models/Order";
import { Promotion } from "@/models/Promotion";
import { StripeWebhookEvent } from "@/models/StripeWebhookEvent";
import type Stripe from "stripe";

export const runtime = "nodejs";

/** Stripe requires the raw body for signature verification. */
export const dynamic = "force-dynamic";

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: number }).code === 11000;
}

export async function POST(req: Request) {
  let whSecret: string | null;
  try {
    whSecret = assertStripeWebhookSecretOptional();
  } catch (e) {
    if (e instanceof StripeSetupError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    throw e;
  }

  if (!whSecret) {
    return NextResponse.json(
      {
        error:
          "Webhook signing secret not configured. Set STRIPE_WEBHOOK_SECRET (starts with whsec_) from Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret.",
      },
      { status: 503 }
    );
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

  const body = await req.text();
  const sig = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await connectDB();

    if (event.type === "checkout.session.completed") {
      const sessionThin = event.data.object as Stripe.Checkout.Session;
      const orderId = sessionThin.metadata?.orderId;
      if (!orderId) {
        console.warn("checkout.session.completed without orderId metadata");
        return NextResponse.json({ received: true });
      }

      const orderExists = await Order.findById(orderId).select("_id").lean();
      if (!orderExists) {
        console.warn("Order not found for webhook", orderId);
        try {
          await StripeWebhookEvent.create({ eventId: event.id });
        } catch (createErr) {
          if (!isDuplicateKeyError(createErr)) throw createErr;
        }
        return NextResponse.json({ received: true });
      }

      const expanded = await stripe.checkout.sessions.retrieve(sessionThin.id, {
        expand: ["payment_intent"],
      });

      const piId =
        typeof expanded.payment_intent === "string"
          ? expanded.payment_intent
          : expanded.payment_intent?.id;

      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            stripeCheckoutSessionId: expanded.id,
            ...(piId ? { stripePaymentIntentId: piId } : {}),
          },
        }
      );

      const paid = expanded.payment_status === "paid";

      if (paid) {
        const transitioned = await Order.findOneAndUpdate(
          { _id: orderId, paymentStatus: { $ne: "paid" } },
          {
            $set: {
              paymentStatus: "paid",
              orderStatus: "paid",
            },
          },
          { new: true }
        );

        if (transitioned?.promoCode) {
          await Promotion.updateOne({ code: transitioned.promoCode }, { $inc: { usedCount: 1 } });
        }

        const orderDoc = await Order.findById(orderId);
        const sendCustomer = process.env.ORDER_SEND_CUSTOMER_CONFIRMATION !== "false";
        const customerDone = !sendCustomer || Boolean(orderDoc?.confirmationEmailSent);
        const merchantDone = Boolean(orderDoc?.merchantNotificationEmailSent);
        if (orderDoc && !(customerDone && merchantDone)) {
          try {
            await sendPaidOrderEmails(orderDoc, {
              stripeSessionId: expanded.id,
              stripePaymentIntentId: piId,
            });
          } catch (mailErr) {
            console.error("Order paid but email failed", mailErr);
            return NextResponse.json({ error: "Email delivery failed" }, { status: 500 });
          }
        }
      }

      try {
        await StripeWebhookEvent.create({ eventId: event.id, orderId });
      } catch (createErr) {
        if (!isDuplicateKeyError(createErr)) throw createErr;
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const piId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (piId) {
        await Order.updateMany(
          { stripePaymentIntentId: piId },
          { $set: { paymentStatus: "refunded", orderStatus: "refunded" } }
        );
      }
      try {
        await StripeWebhookEvent.create({ eventId: event.id });
      } catch (createErr) {
        if (!isDuplicateKeyError(createErr)) throw createErr;
      }
    }
  } catch (e) {
    console.error("Webhook handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
