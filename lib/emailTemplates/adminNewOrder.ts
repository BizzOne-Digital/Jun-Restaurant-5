import type { OrderDoc } from "@/models/Order";
import { RESTAURANT_ADDRESS_LINES, RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";

export type AdminNewOrderContext = {
  siteOrigin: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  restaurantName?: string;
  /** Absolute logo URL — when null/undefined, the header shows the restaurant name as text. */
  logoUrl?: string | null;
  addressLines?: readonly string[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function buildAdminNewOrderSubject(
  orderNumber: string,
  total: number,
  restaurantName: string = RESTAURANT_DISPLAY_NAME
): string {
  return `[New order] ${restaurantName} ${orderNumber} — ${money(total)} paid`;
}

export function buildAdminNewOrderHtml(order: OrderDoc, ctx: AdminNewOrderContext): string {
  const restaurant = ctx.restaurantName ?? RESTAURANT_DISPLAY_NAME;
  const addressLines = ctx.addressLines ?? RESTAURANT_ADDRESS_LINES;
  const rows =
    order.items
      ?.map(
        (it) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${it.quantity}×</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${money(it.price * it.quantity)}</td>
    </tr>`
      )
      .join("") || "";

  const logoBlock = ctx.logoUrl
    ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${escapeHtml(restaurant)}" width="160" style="max-width:160px;height:auto;" />`
    : `<p style="margin:0;font-size:18px;font-weight:700;color:#111827;letter-spacing:0.02em;">${escapeHtml(restaurant)}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:20px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:18px;font-weight:700;">New paid order — ${escapeHtml(restaurant)}</p>
              <p style="margin:0;font-size:14px;color:#374151;">Order <strong>${escapeHtml(order.orderNumber)}</strong> · In-store pickup</p>
              <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Stripe Checkout: ${escapeHtml(ctx.stripeSessionId)}${
                ctx.stripePaymentIntentId ? `<br/>Payment Intent: ${escapeHtml(ctx.stripePaymentIntentId)}` : ""
              }</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 12px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">Customer</p>
              <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(order.customerName)} · ${escapeHtml(order.customerEmail)} · ${escapeHtml(order.customerPhone)}</p>
              ${order.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;"><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr style="background:#f3f4f6;font-size:12px;text-transform:uppercase;color:#6b7280;">
                  <th align="left" style="padding:8px;">Qty</th>
                  <th align="left" style="padding:8px;">Item</th>
                  <th align="right" style="padding:8px;">Line</th>
                </tr>
                ${rows}
              </table>
              <p style="margin:12px 0 0;font-size:14px;">Subtotal ${money(order.subtotal)} · Tax ${money(order.tax ?? 0)}${
                (order.tip ?? 0) > 0 ? ` · Tip ${money(order.tip ?? 0)}` : ""
              } · Total <strong>${money(order.total)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#374151;">${addressLines.map((l) => escapeHtml(l)).join(" · ")}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px 22px;background:#f9fafb;text-align:center;font-size:11px;color:#6b7280;">
              Automated kitchen notification — ${escapeHtml(restaurant)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
