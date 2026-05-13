/**
 * lib/order-app-sync.ts
 *
 * Backend-only helper. Sends a copy of a successfully paid order to the
 * central Restaurant Order App. This is a non-blocking side effect — any
 * failure here must never interrupt the existing payment / email / success flow.
 *
 * Never import this file in frontend / browser code.
 */

import type { OrderDoc } from "@/models/Order";

export interface OrderAppPayload {
  restaurantKey: string;
  sourceOrderId: string;
  orderNumber: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  orderType: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string | null;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
    notes: string;
  }[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  tip: number;
  total: number;
  currency: string;
  paidAt: string;
}

function formatDeliveryAddress(order: OrderDoc): string | null {
  const a = order.deliveryAddress;
  if (!a || order.orderType !== "delivery") return null;
  return [a.line1, a.line2, a.city, a.province, a.postal, a.country]
    .filter(Boolean)
    .join(", ");
}

export async function sendPaidOrderToOrderApp(
  order: OrderDoc,
  paymentData: {
    stripePaymentIntentId?: string | null;
    stripeCheckoutSessionId?: string | null;
    paidAt?: Date;
  }
): Promise<void> {
  const apiUrl = process.env.ORDER_APP_API_URL?.trim();
  const restaurantKey = process.env.ORDER_APP_RESTAURANT_KEY?.trim();
  const apiKey = process.env.ORDER_APP_API_KEY?.trim();

  if (!apiUrl || !restaurantKey || !apiKey) {
    console.warn("Order App sync skipped: missing env (ORDER_APP_API_URL, ORDER_APP_RESTAURANT_KEY, or ORDER_APP_API_KEY)");
    return;
  }

  const payload: OrderAppPayload = {
    restaurantKey,
    sourceOrderId: order._id.toString(),
    orderNumber: order.orderNumber,
    stripePaymentIntentId: paymentData.stripePaymentIntentId ?? order.stripePaymentIntentId ?? null,
    stripeCheckoutSessionId: paymentData.stripeCheckoutSessionId ?? order.stripeCheckoutSessionId ?? null,
    orderType: order.orderType,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      address: formatDeliveryAddress(order),
    },
    items: (order.items ?? []).map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      notes: it.notes ?? "",
    })),
    subtotal: order.subtotal,
    tax: order.tax ?? 0,
    deliveryFee: order.deliveryFee ?? 0,
    discount: order.discount ?? 0,
    tip: order.tip ?? 0,
    total: order.total,
    currency: "cad",
    paidAt: (paymentData.paidAt ?? new Date()).toISOString(),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${apiUrl}/api/integration/orders/paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    console.log(`Order App sync success for order ${order.orderNumber}`);
  } finally {
    clearTimeout(timeout);
  }
}
