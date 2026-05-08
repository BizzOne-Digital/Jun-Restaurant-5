import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import type { OrderDoc } from "@/models/Order";
import { sendMailgunEmail, isMailgunConfigured } from "@/lib/mailgun";
import { assertPublicSiteUrl } from "@/lib/site-url";
import {
  buildOrderStatusSubject,
  buildOrderStatusUpdateHtml,
  buildOrderStatusUpdateText,
  type StatusNotifyKind,
} from "@/lib/emailTemplates/orderStatusUpdate";

const CC_DEFAULT = "junkong68@gmail.com";

function ccList(): string[] {
  return [(process.env.ORDER_CC_EMAIL?.trim() || CC_DEFAULT).toLowerCase()];
}

const NOTIFY_STATUSES: StatusNotifyKind[] = ["completed", "cancelled"];

function isStatusNotifyKind(s: string): s is StatusNotifyKind {
  return (NOTIFY_STATUSES as string[]).includes(s);
}

/**
 * Sends Mailgun status update to the customer when an admin sets order status to completed or cancelled.
 * Skips if Mailgun is not configured or this status was already emailed (statusEmailLog).
 * Email failures are logged only — they do not throw.
 */
export async function sendOrderStatusEmailIfNeeded(order: OrderDoc, previousStatus: string): Promise<void> {
  if (previousStatus === order.orderStatus) return;
  if (!isStatusNotifyKind(order.orderStatus)) return;
  if (!isMailgunConfigured()) {
    console.info("Order status email skipped: Mailgun not configured");
    return;
  }
  if (order.orderStatus === "completed" && order.paymentStatus !== "paid") {
    return;
  }

  await connectDB();
  const fresh = await Order.findById(order._id);
  if (!fresh) return;

  const kind = order.orderStatus as StatusNotifyKind;
  const already = (fresh.statusEmailLog ?? []).some(
    (entry: { status?: string }) => entry.status === order.orderStatus
  );
  if (already) return;

  const siteOrigin = assertPublicSiteUrl();
  const subject = buildOrderStatusSubject();
  const html = buildOrderStatusUpdateHtml(fresh, kind, siteOrigin);
  const text = buildOrderStatusUpdateText(fresh, kind);

  try {
    await sendMailgunEmail({
      to: fresh.customerEmail,
      cc: ccList(),
      subject,
      html,
      text,
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
