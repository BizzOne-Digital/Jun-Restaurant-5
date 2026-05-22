import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getStripe } from "@/lib/stripe";
import { assertStripePublishableKey } from "@/lib/stripe-env";
import { validateCartItems } from "@/lib/cart-validate";
import { applyPromotion } from "@/lib/promo";
import { generateOrderNumber } from "@/lib/order-number";
import { Order } from "@/models/Order";
import { SiteSetting } from "@/models/SiteSetting";
import type { CartItem } from "@/types";
import type Stripe from "stripe";
import { Types } from "mongoose";
import { assertPublicSiteUrl, publicSiteUrlWithPath } from "@/lib/site-url";
import { hasMinPhoneDigits } from "@/lib/email-validation";
import {
  ONO_POKE_STRIPE_CONNECTED_ACCOUNT_ID,
  PAYMENT_MODE,
  calculatePlatformFee,
} from "@/lib/payment-config";

export { StripeSetupError } from "@/lib/stripe-env";

const AddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  province: z.string().min(1).max(80),
  postal: z.string().min(1).max(20),
  country: z.string().max(2).optional().default("CA"),
});

export const CheckoutBodySchema = z.object({
  items: z.array(z.record(z.unknown())).min(1),
  customerName: z.string().trim().min(2, "Name is required (minimum 2 characters)").max(120),
  customerEmail: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  customerPhone: z
    .string()
    .max(40)
    .refine((v) => hasMinPhoneDigits(v), { message: "Phone number should contain at least 7 digits" }),
  /** Ignored for compatibility — this location is pickup-only. */
  orderType: z.enum(["pickup"]).optional(),
  deliveryAddress: AddressSchema.optional().nullable(),
  promoCode: z.string().max(40).optional(),
  notes: z.string().max(1000).optional(),
  /** Optional gratuity in dollars. Capped at $999 to defeat fat-finger / abuse. */
  tip: z.coerce.number().min(0).max(999).optional(),
})
  .superRefine((data, ctx) => {
    if (data.deliveryAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivery is not available. Pickup only.",
        path: ["deliveryAddress"],
      });
    }
  });

export type CheckoutBody = z.infer<typeof CheckoutBodySchema>;

const TAX_RATE = 0.13;

export async function createStripeCheckoutSession(
  data: CheckoutBody,
  sessionUserId: string | null
): Promise<{ url: string | null; orderId: string }> {
  assertStripePublishableKey();
  assertPublicSiteUrl();

  /** Pickup-only: never create delivery orders (ignore client delivery payload). */
  const orderType = "pickup" as const;
  const servingMode = "in_store_pickup" as const;
  const customerEmail = data.customerEmail.trim().toLowerCase();

  const items = data.items as unknown as CartItem[];
  const validated = await validateCartItems(items);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const promoResult = await applyPromotion(data.promoCode, validated.subtotal);
  if ("error" in promoResult && promoResult.error && data.promoCode) {
    throw new Error(promoResult.error);
  }

  const discount = promoResult.discount;
  const promoCode = promoResult.promoCode;
  const afterDiscount = Math.max(0, Math.round((validated.subtotal - discount) * 100) / 100);
  const deliveryFee = 0;
  const taxable = afterDiscount + deliveryFee;
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  /** Tip is voluntary, never taxed, and always added on top. */
  const tip = Math.max(0, Math.round((data.tip ?? 0) * 100) / 100);
  const total = Math.round((taxable + tax + tip) * 100) / 100;

  await connectDB();

  const settings = await SiteSetting.findOne().sort({ updatedAt: -1 }).lean<{
    restaurantName?: string;
    email?: string;
  } | null>();

  const restaurantEmail = process.env.RESTAURANT_ORDER_EMAIL?.trim() || settings?.email?.trim();
  if (!restaurantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(restaurantEmail)) {
    throw new Error(
      "Restaurant order email is not configured. Set RESTAURANT_ORDER_EMAIL in .env.local or SiteSetting.email in admin / database."
    );
  }

  const restaurantName = settings?.restaurantName?.trim() || "Restaurant";

  // Stripe Connect destination charge — hardcoded server-side, never from DB or admin UI.
  const connectedAccountId = ONO_POKE_STRIPE_CONNECTED_ACCOUNT_ID;

  const orderItems = validated.lines.map((l) => ({
    menuItemId:
      l.menuItemId && Types.ObjectId.isValid(String(l.menuItemId))
        ? new Types.ObjectId(String(l.menuItemId))
        : undefined,
    name: l.name,
    price: l.price,
    quantity: l.quantity,
    selectedOptions: l.selectedOptions ?? {},
    notes: l.notes ?? "",
    image: l.image ?? "",
  }));

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    userId: sessionUserId ?? null,
    customerName: data.customerName,
    customerEmail,
    customerPhone: data.customerPhone,
    orderType,
    servingMode,
    deliveryAddress: null,
    items: orderItems,
    subtotal: validated.subtotal,
    tax,
    deliveryFee,
    discount,
    tip,
    total,
    promoCode,
    paymentStatus: "unpaid",
    orderStatus: "pending",
    notes: data.notes ?? "",
    restaurantOrderEmailSent: false,
    merchantNotificationEmailSent: false,
    confirmationEmailSent: false,
    customerEmailVerified: false,
    confirmationEmailStatus: "skipped",
    confirmationEmailError: "",
  });

  const stripe = getStripe();

  const summary = validated.lines
    .map((l) => `${l.quantity}× ${l.name}`)
    .slice(0, 6)
    .join(" · ");
  const description =
    `${summary}${validated.lines.length > 6 ? "…" : ""}` +
    (discount > 0 ? ` · Promo: ${promoCode}` : "") +
    " · In-store pickup · Tax included";

  const totalCents = Math.round(total * 100);
  const tipCents = Math.round(tip * 100);
  let sumProductCents = 0;
  const productLineItems = validated.lines.map((l) => {
    const unit = Math.round(l.price * 100);
    sumProductCents += unit * l.quantity;
    return {
      quantity: l.quantity,
      price_data: {
        currency: "cad",
        unit_amount: unit,
        product_data: {
          name: l.name.slice(0, 250),
        },
      },
    };
  });

  const tipLineItems =
    tipCents > 0
      ? [
          {
            quantity: 1,
            price_data: {
              currency: "cad",
              unit_amount: tipCents,
              product_data: {
                name: "Tip / gratuity",
                description: "Voluntary gratuity for the restaurant team",
              },
            },
          },
        ]
      : [];

  const remainderCents = totalCents - sumProductCents - tipCents;

  const lineItems =
    remainderCents === 0
      ? [...productLineItems, ...tipLineItems]
      : remainderCents > 0
        ? [
            ...productLineItems,
            ...tipLineItems,
            {
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: remainderCents,
                product_data: {
                  name: "Tax & promo adjustments",
                  description: description.slice(0, 450),
                },
              },
            },
          ]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: totalCents,
                product_data: {
                  name: `Order ${order.orderNumber}`,
                  description: description.slice(0, 450),
                },
              },
            },
          ];

  const metadata = {
    orderId: order._id.toString(),
    restaurantId: "ono-poke-bar",
    restaurantName,
    customerName: data.customerName,
    customerEmail,
    customerPhone: data.customerPhone,
    orderType,
    servingMode: "in_store_pickup",
    paymentMode: PAYMENT_MODE,
    connectedAccountId,
  } satisfies Record<string, string>;

  const platformFeeAmount = calculatePlatformFee(totalCents);

  /**
   * Destination charge: platform creates the charge, application_fee_amount (12%) stays on
   * the platform account, and the remainder (88%) is immediately transferred to the
   * connected restaurant account via transfer_data.destination.
   * Commission rate and account ID are hardcoded in lib/payment-config.ts — not editable
   * from the admin portal.
   */
  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    application_fee_amount: platformFeeAmount,
    transfer_data: { destination: connectedAccountId },
    metadata: {
      ...metadata,
      connectedAccountId,
    },
  };

  const sessionStripe = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "cad",
    customer_email: customerEmail,
    line_items: lineItems,
    success_url: publicSiteUrlWithPath("/payment-success?session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: publicSiteUrlWithPath("/cart"),
    metadata,
    payment_intent_data: paymentIntentData,
  });

  order.stripeCheckoutSessionId = sessionStripe.id;
  if (sessionStripe.payment_intent && typeof sessionStripe.payment_intent === "string") {
    order.stripePaymentIntentId = sessionStripe.payment_intent;
  }
  await order.save();

  return { url: sessionStripe.url, orderId: order._id.toString() };
}
