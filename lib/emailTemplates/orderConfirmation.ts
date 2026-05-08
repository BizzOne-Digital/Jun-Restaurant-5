import type { OrderDoc } from "@/models/Order";
import { ESTIMATED_PICKUP_WINDOW, RESTAURANT_ADDRESS_LINES, RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";
import { getMerchantOrdersLogoUrl } from "@/lib/email/merchant-orders-logo";

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Subject: Order confirmation - {restaurantName} */
export function buildOrderConfirmationSubject(restaurantName: string = RESTAURANT_DISPLAY_NAME): string {
  return `Order confirmation - ${restaurantName}`;
}

function customerGreeting(order: OrderDoc): string {
  const n = order.customerName?.trim();
  if (!n) return "Hello,";
  return `Hi ${escapeHtml(n)},`;
}

function pickupSectionHtml(): string {
  const window = ESTIMATED_PICKUP_WINDOW.trim();
  if (!window) return "";
  return `
                <tr><td style="font-size:13px;color:#6b7280;">Estimated pickup</td></tr>
                <tr><td style="font-size:15px;font-weight:600;color:#111827;padding-bottom:12px;">${escapeHtml(window)}</td></tr>`;
}

function pickupSectionText(): string {
  const window = ESTIMATED_PICKUP_WINDOW.trim();
  if (!window) return "";
  return `Estimated pickup: ${window}\n`;
}

export function buildOrderConfirmationText(
  order: OrderDoc,
  ctx: { stripePaymentIntentId?: string; restaurantName?: string }
): string {
  const restaurant = ctx.restaurantName ?? RESTAURANT_DISPLAY_NAME;
  const name = order.customerName?.trim();
  const greet = name ? `Hi ${name},` : "Hello,";
  const lines =
    order.items
      ?.map((it) => `  • ${it.quantity}× ${it.name} @ ${money(it.price)} → ${money(it.quantity * it.price)}`)
      .join("\n") || "  (items on file)";
  return [
    greet,
    "",
    `We have received your order at ${restaurant}.`,
    "",
    `Order number: ${order.orderNumber}`,
    `Order ID: ${order._id}`,
    pickupSectionText().trimEnd(),
    `Order total: ${money(order.total)}`,
    ctx.stripePaymentIntentId ? `Payment reference: ${ctx.stripePaymentIntentId}` : "",
    "",
    "We'll prepare your pickup order and contact you if anything changes.",
    "",
    "Order items",
    lines,
    "",
    "Pickup location",
    ...RESTAURANT_ADDRESS_LINES.map((l) => `  ${l}`),
    "",
    "— Merchant Orders (on behalf of the restaurant)",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOrderConfirmationHtml(
  order: OrderDoc,
  ctx: { siteOrigin: string; stripePaymentIntentId?: string; restaurantName?: string }
): string {
  const restaurant = ctx.restaurantName ?? RESTAURANT_DISPLAY_NAME;
  const servingLabel = "In-store pickup";
  const rows =
    order.items
      ?.map(
        (it) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">${it.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">${escapeHtml(it.name)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">${money(it.price * it.quantity)}</td>
    </tr>`
      )
      .join("") || "";

  const logo = getMerchantOrdersLogoUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:24px 28px 8px;text-align:center;border-bottom:1px solid #e5e7eb;background:#fafafa;">
              <img src="${escapeHtml(logo)}" alt="Merchant Orders" width="180" style="max-width:180px;height:auto;display:inline-block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Merchant Orders</p>
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(restaurant)}</p>
              <p style="margin:0;font-size:15px;color:#374151;">${customerGreeting(order)}</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.55;color:#374151;">We have <strong>received your order</strong>. Thank you — the restaurant will prepare it for pickup.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;padding:16px;">
                <tr><td style="font-size:13px;color:#6b7280;">Order number</td></tr>
                <tr><td style="font-size:16px;font-weight:700;color:#111827;padding-bottom:8px;">${escapeHtml(order.orderNumber)}</td></tr>
                <tr><td style="font-size:13px;color:#6b7280;">Order ID</td></tr>
                <tr><td style="font-size:13px;font-family:monospace;color:#111827;padding-bottom:12px;word-break:break-all;">${escapeHtml(String(order._id))}</td></tr>
                ${pickupSectionHtml()}
                <tr><td style="font-size:13px;color:#6b7280;">Serving mode</td></tr>
                <tr><td style="font-size:15px;font-weight:600;color:#111827;padding-bottom:12px;">${servingLabel}</td></tr>
                <tr><td style="font-size:13px;color:#6b7280;">Order total</td></tr>
                <tr><td style="font-size:16px;font-weight:700;color:#111827;padding-bottom:12px;">${money(order.total)}</td></tr>
                <tr><td style="font-size:13px;color:#6b7280;">Payment</td></tr>
                <tr><td style="font-size:15px;color:#111827;">Payment processed successfully via Stripe.${ctx.stripePaymentIntentId ? ` Reference: ${escapeHtml(ctx.stripePaymentIntentId)}.` : ""}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">Order items</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr style="background:#f3f4f6;">
                  <th align="left" style="padding:10px 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Qty</th>
                  <th align="left" style="padding:10px 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Item</th>
                  <th align="right" style="padding:10px 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Price</th>
                </tr>
                ${rows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#374151;">
                <tr><td style="padding:6px 0;">Subtotal</td><td align="right" style="padding:6px 0;">${money(order.subtotal)}</td></tr>
                <tr><td style="padding:6px 0;">Promo / discount</td><td align="right" style="padding:6px 0;">${money(order.discount ?? 0)}</td></tr>
                <tr><td style="padding:6px 0;">Tax</td><td align="right" style="padding:6px 0;">${money(order.tax ?? 0)}</td></tr>
                <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:10px;margin-top:8px;"></td></tr>
                <tr><td style="padding:8px 0 0;font-size:16px;font-weight:700;color:#111827;">Total</td><td align="right" style="padding:8px 0 0;font-size:16px;font-weight:700;color:#111827;">${money(order.total)}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">Pickup location</p>
              ${RESTAURANT_ADDRESS_LINES.map(
                (line) => `<p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">${escapeHtml(line)}</p>`
              ).join("")}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;line-height:1.5;">
              This is an automated message from Merchant Orders on behalf of ${escapeHtml(restaurant)}.<br/>
              Please contact the restaurant with questions about your order.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
