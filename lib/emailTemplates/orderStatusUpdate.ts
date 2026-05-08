import type { OrderDoc } from "@/models/Order";
import { RESTAURANT_ADDRESS_LINES, RESTAURANT_DISPLAY_NAME } from "@/lib/email/constants";

export type StatusEmailKind = "preparing" | "ready" | "completed" | "cancelled";

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

function logoUrl(siteOrigin: string): string {
  return `${siteOrigin}/email/merchant-orders-logo.png`;
}

function messageForStatus(status: StatusEmailKind): string {
  switch (status) {
    case "preparing":
      return "Your order is now being prepared.";
    case "ready":
      return "Your order is ready for pickup.";
    case "completed":
      return "Your order has been completed. Thank you for ordering with ONO Poké Bar.";
    case "cancelled":
      return "Your order has been cancelled. If you have questions, please contact the restaurant.";
    default:
      return "Your order status has been updated.";
  }
}

function badgeColor(status: StatusEmailKind): { bg: string; fg: string } {
  switch (status) {
    case "ready":
      return { bg: "#d1fae5", fg: "#065f46" };
    case "cancelled":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "completed":
      return { bg: "#e0e7ff", fg: "#3730a3" };
    default:
      return { bg: "#fef3c7", fg: "#92400e" };
  }
}

export function buildOrderStatusSubject(orderNumber: string, status: StatusEmailKind): string {
  if (status === "ready") {
    return `${RESTAURANT_DISPLAY_NAME} - Your order is ready - Order #${orderNumber}`;
  }
  return `${RESTAURANT_DISPLAY_NAME} - Online Order Update - Order #${orderNumber}`;
}

export function buildOrderStatusUpdateHtml(
  order: OrderDoc,
  status: StatusEmailKind,
  siteOrigin: string
): string {
  const colors = badgeColor(status);
  const logo = logoUrl(siteOrigin);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:24px 28px 8px;text-align:center;border-bottom:1px solid #e5e7eb;">
              <img src="${logo}" alt="Merchant Orders" width="180" style="max-width:180px;height:auto;display:inline-block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(RESTAURANT_DISPLAY_NAME)}</p>
              <p style="margin:0;font-size:15px;color:#374151;">Hi ${escapeHtml(order.customerName)},</p>
              <p style="margin:18px 0 0;font-size:15px;line-height:1.55;color:#374151;">${messageForStatus(status)}</p>
              <div style="margin-top:18px;">
                <span style="display:inline-block;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;background:${colors.bg};color:${colors.fg};text-transform:capitalize;">${escapeHtml(status)}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">Your details</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#374151;">
                <tr><td style="padding:4px 0;width:120px;color:#6b7280;">Name</td><td style="padding:4px 0;">${escapeHtml(order.customerName)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;">${escapeHtml(order.customerPhone)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;">${escapeHtml(order.customerEmail)}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">Order details</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#374151;">
                <tr><td style="padding:4px 0;width:160px;color:#6b7280;">Order number</td><td style="padding:4px 0;">${escapeHtml(order.orderNumber)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Serving mode</td><td style="padding:4px 0;">In-store pickup</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Payment status</td><td style="padding:4px 0;text-transform:capitalize;">${escapeHtml(order.paymentStatus)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Total</td><td style="padding:4px 0;font-weight:700;">${money(order.total)}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">Restaurant</p>
              ${RESTAURANT_ADDRESS_LINES.map(
                (line) => `<p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">${escapeHtml(line)}</p>`
              ).join("")}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 28px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;line-height:1.5;">
              This is an automated notification. Please do not reply.<br/>
              Powered by Merchant Orders
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
