import type { OrderDoc } from "@/models/Order";
import { RESTAURANT_ADDRESS_LINES, RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";

/** Status emails are sent to customers only for these transitions (not preparing / ready / accepted). */
export type StatusNotifyKind = "completed" | "cancelled";

export type OrderStatusEmailContext = {
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

function messageForStatus(status: StatusNotifyKind): string {
  if (status === "completed") return "Your order has been completed.";
  return "Your order has been cancelled.";
}

function badgeColor(status: StatusNotifyKind): { bg: string; fg: string } {
  if (status === "cancelled") return { bg: "#fee2e2", fg: "#991b1b" };
  return { bg: "#e0e7ff", fg: "#3730a3" };
}

/** Subject: Online Order Update - {restaurantName} */
export function buildOrderStatusSubject(restaurantName: string = RESTAURANT_DISPLAY_NAME): string {
  return `Online Order Update - ${restaurantName}`;
}

function customerGreeting(order: OrderDoc): string {
  const n = order.customerName?.trim();
  if (!n) return "Hello,";
  return `Hi ${escapeHtml(n)},`;
}

export function buildOrderStatusUpdateText(
  order: OrderDoc,
  status: StatusNotifyKind,
  ctx: OrderStatusEmailContext = {}
): string {
  const restaurant = ctx.restaurantName ?? RESTAURANT_DISPLAY_NAME;
  const addressLines = ctx.addressLines ?? RESTAURANT_ADDRESS_LINES;
  const name = order.customerName?.trim();
  const greet = name ? `Hi ${name},` : "Hello,";
  return [
    greet,
    "",
    messageForStatus(status),
    "",
    `Restaurant: ${restaurant}`,
    `Order number: ${order.orderNumber}`,
    `Order ID: ${order._id}`,
    `Status: ${status}`,
    `Order total: ${money(order.total)}`,
    "",
    ...addressLines.map((l) => `  ${l}`),
    "",
    `— ${restaurant}`,
  ].join("\n");
}

export function buildOrderStatusUpdateHtml(
  order: OrderDoc,
  status: StatusNotifyKind,
  ctx: OrderStatusEmailContext = {}
): string {
  const restaurant = ctx.restaurantName ?? RESTAURANT_DISPLAY_NAME;
  const addressLines = ctx.addressLines ?? RESTAURANT_ADDRESS_LINES;
  const colors = badgeColor(status);
  const statusLabel = status === "completed" ? "Completed" : "Cancelled";

  const logoBlock = ctx.logoUrl
    ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${escapeHtml(restaurant)}" width="180" style="max-width:180px;height:auto;display:inline-block;" />`
    : `<p style="margin:0;font-size:20px;font-weight:700;color:#111827;letter-spacing:0.02em;">${escapeHtml(restaurant)}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:24px 28px 16px;text-align:center;border-bottom:1px solid #e5e7eb;background:#fafafa;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(restaurant)}</p>
              <p style="margin:0;font-size:15px;color:#374151;">${customerGreeting(order)}</p>
              <p style="margin:18px 0 0;font-size:15px;line-height:1.55;color:#374151;">${escapeHtml(messageForStatus(status))}</p>
              <div style="margin-top:18px;">
                <span style="display:inline-block;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;background:${colors.bg};color:${colors.fg};">${statusLabel}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">Your order</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#374151;">
                <tr><td style="padding:4px 0;width:140px;color:#6b7280;">Order number</td><td style="padding:4px 0;">${escapeHtml(order.orderNumber)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Order ID</td><td style="padding:4px 0;font-size:12px;font-family:monospace;word-break:break-all;">${escapeHtml(String(order._id))}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Total</td><td style="padding:4px 0;font-weight:700;">${money(order.total)}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">Restaurant</p>
              ${addressLines
                .map(
                  (line) => `<p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">${escapeHtml(line)}</p>`
                )
                .join("")}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;line-height:1.5;">
              This is an automated message from ${escapeHtml(restaurant)}.<br/>
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
