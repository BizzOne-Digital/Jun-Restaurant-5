import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import type { OrderDoc } from "@/models/Order";
import { sendMailgunEmail, isMailgunConfigured } from "@/lib/mailgun";
import { assertPublicSiteUrl } from "@/lib/site-url";
import {
  buildOrderStatusSubject,
  buildOrderStatusUpdateHtml,
  type StatusEmailKind,
} from "@/lib/emailTemplates/orderStatusUpdate";

const CC_DEFAULT = "junkong68@gmail.com";

function ccList(): string[] {
  return [(process.env.ORDER_CC_EMAIL?.trim() || CC_DEFAULT).toLowerCase()];
}

const NOTIFY_STATUSES: StatusEmailKind[] = ["preparing", "ready", "completed", "cancelled"];

function isStatusEmailKind(s: string): s is StatusEmailKind {
  return (NOTIFY_STATUSES as string[]).includes(s);
}

/**
 * Sends Mailgun status update to the customer when an admin changes order status.
 * Skips if Mailgun is not configured or this status was already emailed (statusEmailLog).
 */
export async function sendOrderStatusEmailIfNeeded(order: OrderDoc, previousStatus: string): Promise<void> {
  if (previousStatus === order.orderStatus) return;
  if (!isStatusEmailKind(order.orderStatus)) return;
  if (!isMailgunConfigured()) {
    console.info("Order status email skipped: Mailgun not configured");
    return;
  }
  if (["preparing", "ready", "completed"].includes(order.orderStatus) && order.paymentStatus !== "paid") {
    return;
  }

  await connectDB();
  const fresh = await Order.findById(order._id);
  if (!fresh) return;

  const kind = order.orderStatus as StatusEmailKind;
  const already = (fresh.statusEmailLog ?? []).some(
    (entry: { status?: string }) => entry.status === order.orderStatus
  );
  if (already) return;

  const siteOrigin = assertPublicSiteUrl();
  const subject = buildOrderStatusSubject(fresh.orderNumber, kind);
  const html = buildOrderStatusUpdateHtml(fresh, kind, siteOrigin);

  try {
    await sendMailgunEmail({
      to: fresh.customerEmail,
      cc: ccList(),
      subject,
      html,
      replyTo: process.env.RESTAURANT_ORDER_EMAIL?.trim() || undefined,
    });
  } catch (e) {
    console.error("Status update email failed", e);
    return;
  }

  await Order.updateOne(
    { _id: fresh._id },
    {
      $push: {
        statusEmailLog: {
          status: order.orderStatus,
          sentAt: new Date(),
          recipient: fresh.customerEmail,
        },
      },
    }
  );
}
