import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";
import type { OrderDoc } from "@/models/Order";
import { Order } from "@/models/Order";
import { assertPublicSiteUrl } from "@/lib/site-url";
import { sendMailgunEmail, isMailgunConfigured } from "@/lib/mailgun";
import { buildOrderConfirmationHtml, buildOrderConfirmationSubject } from "@/lib/emailTemplates/orderConfirmation";
import { buildAdminNewOrderHtml, buildAdminNewOrderSubject } from "@/lib/emailTemplates/adminNewOrder";

const CC_DEFAULT = "junkong68@gmail.com";

function orderCcEmail(): string {
  return (process.env.ORDER_CC_EMAIL?.trim() || CC_DEFAULT).toLowerCase();
}

function fromEmail(): string | null {
  const v = process.env.ORDER_FROM_EMAIL?.trim();
  return v || null;
}

function provider(): string {
  return (process.env.EMAIL_PROVIDER?.trim() || "").toLowerCase();
}

function formatAddress(order: OrderDoc): string {
  const a = order.deliveryAddress;
  if (!a || order.orderType !== "delivery") return "Pickup / in-store";
  return [a.line1, a.line2, a.city, a.province, a.postal, a.country].filter(Boolean).join(", ");
}

export function buildRestaurantOrderEmailBody(
  order: OrderDoc,
  ctx: { stripeSessionId: string; stripePaymentIntentId?: string }
): string {
  const lines =
    order.items
      ?.map((it) => `  • ${it.quantity}× ${it.name} @ $${it.price.toFixed(2)} ea → $${(it.quantity * it.price).toFixed(2)}`)
      .join("\n") || "";

  return [
    `New paid order — ${order.orderNumber}`,
    ``,
    `Order ID: ${order._id}`,
    `Payment status: ${order.paymentStatus}`,
    `Stripe Checkout Session: ${ctx.stripeSessionId}`,
    ctx.stripePaymentIntentId ? `Stripe Payment Intent: ${ctx.stripePaymentIntentId}` : "",
    ``,
    `Customer`,
    `  Name: ${order.customerName}`,
    `  Email: ${order.customerEmail}`,
    `  Phone: ${order.customerPhone}`,
    `  Type: ${order.orderType} (${order.servingMode ?? "in_store_pickup"})`,
    `  Address / pickup: ${formatAddress(order)}`,
    order.notes ? `  Notes: ${order.notes}` : "",
    ``,
    `Items`,
    lines || "  (no line items)",
    ``,
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `Discount: $${(order.discount ?? 0).toFixed(2)}`,
    `Delivery fee: $${(order.deliveryFee ?? 0).toFixed(2)}`,
    `Tax: $${(order.tax ?? 0).toFixed(2)}`,
    `Total paid: $${order.total.toFixed(2)}`,
    ``,
    `Promo code: ${order.promoCode || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCustomerConfirmationBody(
  order: OrderDoc,
  ctx: { stripeSessionId: string; stripePaymentIntentId?: string }
): string {
  return [
    `Hi ${order.customerName},`,
    ``,
    `Thanks for ordering from us. Your payment was received.`,
    ``,
    `Order number: ${order.orderNumber}`,
    `Total: $${order.total.toFixed(2)}`,
    `Stripe session: ${ctx.stripeSessionId}`,
    ctx.stripePaymentIntentId ? `Payment reference: ${ctx.stripePaymentIntentId}` : "",
    ``,
    `We'll prepare your in-store pickup order and contact you if anything changes.`,
    ``,
    `— ${order.customerName ? "ONO Poké Bar" : "Restaurant"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendResend(to: string, cc: string, subject: string, text: string, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");

  const from = fromEmail();
  if (!from) throw new Error("ORDER_FROM_EMAIL is required to send mail");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      cc: [cc],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error ${res.status}: ${errText}`);
  }
}

async function sendSmtp(to: string, cc: string, subject: string, text: string, replyTo?: string) {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = fromEmail();

  if (!host || !portRaw || !from) {
    throw new Error("SMTP_HOST, SMTP_PORT, and ORDER_FROM_EMAIL are required when EMAIL_PROVIDER=smtp");
  }
  const port = Number(portRaw);
  if (!Number.isFinite(port)) throw new Error("SMTP_PORT must be a number");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    cc,
    subject,
    text,
    replyTo: replyTo || undefined,
  });
}

async function dispatchLegacyEmail(to: string, cc: string, subject: string, text: string, replyTo?: string) {
  const p = provider();
  if (p === "resend") {
    await sendResend(to, cc, subject, text, replyTo);
    return;
  }
  if (p === "smtp") {
    await sendSmtp(to, cc, subject, text, replyTo);
    return;
  }
  throw new Error(
    `EMAIL_PROVIDER must be "resend" or "smtp" to send order emails (got "${p || "empty"}"). Configure Mailgun (MAILGUN_API_KEY, …) or legacy email. See README.`
  );
}

async function syncLegacyEmailFlags(orderId: string, sentCustomer: boolean) {
  const now = new Date();
  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        merchantNotificationEmailSent: true,
        merchantNotificationEmailSentAt: now,
        restaurantOrderEmailSent: true,
        restaurantOrderEmailSentAt: now,
        ...(sentCustomer
          ? {
              confirmationEmailSent: true,
              confirmationEmailSentAt: now,
              customerOrderConfirmationSentAt: now,
              confirmationEmailStatus: "sent",
              confirmationEmailError: "",
            }
          : { confirmationEmailStatus: "skipped" }),
      },
    }
  );
}

async function sendPaidOrderEmailsMailgun(
  order: OrderDoc,
  ctx: { stripeSessionId: string; stripePaymentIntentId?: string }
) {
  const siteOrigin = assertPublicSiteUrl();
  const settings = await SiteSetting.findOne().sort({ updatedAt: -1 }).lean<{ email?: string } | null>();
  const restaurantTo =
    process.env.RESTAURANT_ORDER_EMAIL?.trim() || settings?.email?.trim();
  if (!restaurantTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(restaurantTo)) {
    throw new Error(
      "Restaurant order email is not configured. Set RESTAURANT_ORDER_EMAIL or SiteSetting.email in the database."
    );
  }

  const cc = orderCcEmail();
  const adminBcc = process.env.ADMIN_ORDER_EMAIL?.trim();
  const bcc =
    adminBcc && adminBcc.toLowerCase() !== restaurantTo.toLowerCase() ? [adminBcc] : undefined;

  let o = await Order.findById(order._id);
  if (!o) throw new Error("Order not found");

  if (o.customerOrderConfirmationSentAt && !o.confirmationEmailSent) {
    await Order.updateOne(
      { _id: o._id },
      { $set: { confirmationEmailSent: true, confirmationEmailSentAt: o.customerOrderConfirmationSentAt } }
    );
  }
  if (o.restaurantOrderEmailSent && !o.merchantNotificationEmailSent) {
    await Order.updateOne(
      { _id: o._id },
      {
        $set: {
          merchantNotificationEmailSent: true,
          merchantNotificationEmailSentAt: o.restaurantOrderEmailSentAt ?? new Date(),
        },
      }
    );
  }

  o = await Order.findById(order._id);
  if (!o) throw new Error("Order not found");

  const sendCustomer = process.env.ORDER_SEND_CUSTOMER_CONFIRMATION !== "false";
  const customerDone = !sendCustomer || Boolean(o.confirmationEmailSent);
  const merchantDone = Boolean(o.merchantNotificationEmailSent);
  if (customerDone && merchantDone) return;

  if (!merchantDone) {
    await sendMailgunEmail({
      to: restaurantTo,
      cc: [cc],
      bcc,
      replyTo: o.customerEmail,
      subject: buildAdminNewOrderSubject(o.orderNumber, o.total),
      html: buildAdminNewOrderHtml(o, { siteOrigin, stripeSessionId: ctx.stripeSessionId, stripePaymentIntentId: ctx.stripePaymentIntentId }),
    });
    const now = new Date();
    await Order.updateOne(
      { _id: o._id },
      {
        $set: {
          merchantNotificationEmailSent: true,
          merchantNotificationEmailSentAt: now,
          restaurantOrderEmailSent: true,
          restaurantOrderEmailSentAt: now,
        },
      }
    );
  }

  if (sendCustomer && !o.confirmationEmailSent) {
    const latest = await Order.findById(order._id);
    if (!latest) return;
    if (latest.confirmationEmailSent) return;
    try {
      await sendMailgunEmail({
        to: latest.customerEmail,
        cc: [cc],
        replyTo: restaurantTo,
        subject: buildOrderConfirmationSubject(latest.orderNumber),
        html: buildOrderConfirmationHtml(latest, {
          siteOrigin,
          stripePaymentIntentId: ctx.stripePaymentIntentId,
        }),
      });
      const now = new Date();
      await Order.updateOne(
        { _id: latest._id },
        {
          $set: {
            confirmationEmailSent: true,
            confirmationEmailSentAt: now,
            customerOrderConfirmationSentAt: now,
            confirmationEmailStatus: "sent",
            confirmationEmailError: "",
          },
        }
      );
    } catch (customerErr) {
      await Order.updateOne(
        { _id: latest._id },
        {
          $set: {
            confirmationEmailStatus: "failed",
            confirmationEmailError: customerErr instanceof Error ? customerErr.message : "Unknown Mailgun error",
          },
        }
      );
      throw customerErr;
    }
  } else if (!sendCustomer) {
    await Order.updateOne({ _id: order._id }, { $set: { confirmationEmailStatus: "skipped" } });
  }
}

async function sendPaidOrderEmailsLegacy(
  order: OrderDoc,
  ctx: { stripeSessionId: string; stripePaymentIntentId?: string }
) {
  const settings = await SiteSetting.findOne().sort({ updatedAt: -1 }).lean<{ email?: string } | null>();
  const restaurantTo =
    process.env.RESTAURANT_ORDER_EMAIL?.trim() || settings?.email?.trim();
  if (!restaurantTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(restaurantTo)) {
    throw new Error(
      "Restaurant order email is not configured. Set RESTAURANT_ORDER_EMAIL or SiteSetting.email in the database."
    );
  }

  const cc = orderCcEmail();
  const subjectRestaurant = `[New order] ${order.orderNumber} — $${order.total.toFixed(2)} paid`;

  await dispatchLegacyEmail(
    restaurantTo,
    cc,
    subjectRestaurant,
    buildRestaurantOrderEmailBody(order, ctx),
    order.customerEmail
  );

  const sendCustomer = process.env.ORDER_SEND_CUSTOMER_CONFIRMATION !== "false";
  if (sendCustomer && order.customerEmail) {
    const subjectCustomer = `Order confirmed — ${order.orderNumber}`;
    await dispatchLegacyEmail(order.customerEmail, cc, subjectCustomer, buildCustomerConfirmationBody(order, ctx));
  }

  await syncLegacyEmailFlags(order._id.toString(), sendCustomer);
}

/** Restaurant inbox = RESTAURANT_ORDER_EMAIL or falls back to SiteSetting.email */
export async function sendPaidOrderEmails(order: OrderDoc, ctx: { stripeSessionId: string; stripePaymentIntentId?: string }) {
  await connectDB();
  if (isMailgunConfigured()) {
    await sendPaidOrderEmailsMailgun(order, ctx);
    return;
  }
  await sendPaidOrderEmailsLegacy(order, ctx);
}

export function isEmailConfigured(): boolean {
  if (isMailgunConfigured()) return true;
  if (!fromEmail()) return false;
  const p = provider();
  if (p === "resend") return Boolean(process.env.RESEND_API_KEY?.trim());
  if (p === "smtp") return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_PORT?.trim());
  return false;
}
