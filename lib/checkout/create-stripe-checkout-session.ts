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
import { checkoutEmailVerificationRequired } from "@/lib/checkout/email-verification";
import { CheckoutEmailVerification } from "@/models/CheckoutEmailVerification";

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
  checkoutEmailVerificationId: z.string().optional(),
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

/**
 * Phase 2 Stripe Connect: when STRIPE_CONNECTED_ACCOUNT_ID=acct_..., 11% platform fee via application_fee_amount.
 * TODO: Alternatively read per-restaurant acct_ from database when multi-tenant.
 */
function readConnectedAccountId(): string | undefined {
  const raw = process.env.STRIPE_CONNECTED_ACCOUNT_ID?.trim();
  if (!raw) return undefined;
  if (!raw.startsWith("acct_")) {
    throw new Error(`STRIPE_CONNECTED_ACCOUNT_ID must start with acct_. Got: "${raw.slice(0, 12)}…"`);
  }
  return raw;
}

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
  const total = Math.round((taxable + tax) * 100) / 100;

  await connectDB();

  let customerEmailVerified = false;
  if (checkoutEmailVerificationRequired()) {
    if (!data.checkoutEmailVerificationId) {
      throw new Error("This email is not verified. Please check your inbox for the verification code.");
    }
    const verification = await CheckoutEmailVerification.findById(data.checkoutEmailVerificationId);
    if (
      !verification ||
      !verification.verified ||
      verification.expiresAt.getTime() < Date.now() ||
      verification.email !== customerEmail
    ) {
      throw new Error("This email is not verified. Please check your inbox for the verification code.");
    }
    customerEmailVerified = true;
  }

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
  const connectedAccountId = readConnectedAccountId();

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
    total,
    promoCode,
    paymentStatus: "unpaid",
    orderStatus: "pending",
    notes: data.notes ?? "",
    restaurantOrderEmailSent: false,
    merchantNotificationEmailSent: false,
    confirmationEmailSent: false,
    customerEmailVerified,
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

  const remainderCents = totalCents - sumProductCents;

  const lineItems =
    remainderCents === 0
      ? productLineItems
      : remainderCents > 0
        ? [
            ...productLineItems,
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
    ...(connectedAccountId ? { connectedAccountId } : {}),
  } satisfies Record<string, string>;

  const platformFeeAmount = connectedAccountId ? Math.round(totalCents * 0.11) : undefined;

  /**
   * Phase 1 (no acct_): normal Checkout on platform — full amount to platform Stripe account.
   * Phase 2: destination charge — application_fee_amount keeps ~11%; remainder transfers to connected account.
   */
  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = connectedAccountId
    ? {
        application_fee_amount: platformFeeAmount,
        transfer_data: { destination: connectedAccountId },
        metadata: {
          ...metadata,
          connectedAccountId,
        },
      }
    : {
        metadata,
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
