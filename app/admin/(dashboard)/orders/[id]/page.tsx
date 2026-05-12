"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
  selectedOptions?: Record<string, unknown>;
};

type OrderDetail = {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  tip: number;
  total: number;
  promoCode?: string;
  paymentStatus: string;
  orderStatus: string;
  servingMode?: string;
  orderType?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  createdAt: string;
  updatedAt?: string;
  confirmationEmailSent?: boolean;
  confirmationEmailStatus?: string;
  confirmationEmailError?: string;
  merchantNotificationEmailSent?: boolean;
  statusEmailLog?: Array<{ status: string; sentAt: string; recipient: string }>;
};

const STATUSES = ["pending", "paid", "preparing", "ready", "completed", "cancelled", "refunded"] as const;

function money(n: number | undefined): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

function formatDate(d?: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

/** Render a key/value table for an item's option selections, skipping junk. */
function OptionsList({ options }: { options?: Record<string, unknown> }) {
  if (!options || typeof options !== "object") return null;
  const entries = Object.entries(options).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!entries.length) return null;

  return (
    <ul className="mt-2 space-y-1 text-xs text-rice-400">
      {entries.map(([key, value]) => (
        <li key={key} className="flex flex-wrap gap-1">
          <span className="font-semibold uppercase tracking-wide text-rice-500">{key}:</span>
          <span className="text-rice-300">{renderValue(value)}</span>
        </li>
      ))}
    </ul>
  );
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => renderValue(x)).join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updating, setUpdating] = React.useState(false);

  const load = React.useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/orders/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Failed to load order");
        setOrder(data.order as OrderDetail);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (orderStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success(`Order set to ${orderStatus}`);
      load();
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="text-xs text-rice-400 hover:underline">
          ← Back to orders
        </Link>
        <p className="text-sm text-rice-300">Loading order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="text-xs text-rice-400 hover:underline">
          ← Back to orders
        </Link>
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error || "Order not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/orders")}
            className="text-xs text-rice-400 hover:text-rice-200 hover:underline"
          >
            ← Back to orders
          </button>
          <h2 className="mt-1 font-display text-2xl text-rice-50">Order {order.orderNumber}</h2>
          <p className="text-xs text-rice-500">Placed {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.paymentStatus} />
          <StatusBadge status={order.orderStatus} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Items */}
        <div className="md:col-span-2 space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">
              Items ordered ({order.items?.length ?? 0})
            </h3>
            <ul className="mt-3 divide-y divide-white/5">
              {order.items?.map((it, idx) => (
                <li key={idx} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-rice-50">
                      <span className="text-mango-300">{it.quantity}×</span> {it.name}
                    </p>
                    <OptionsList options={it.selectedOptions} />
                    {it.notes ? (
                      <p className="mt-2 rounded-lg border border-mango-400/20 bg-mango-400/5 px-2 py-1 text-xs text-mango-200">
                        Note: {it.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-rice-200">
                    <p className="font-semibold">{money(it.price * it.quantity)}</p>
                    <p className="text-xs text-rice-500">{money(it.price)} each</p>
                  </div>
                </li>
              ))}
              {!order.items?.length && (
                <li className="py-6 text-center text-sm text-rice-500">No line items recorded.</li>
              )}
            </ul>
          </section>

          {order.notes ? (
            <section className="rounded-2xl border border-mango-400/20 bg-mango-400/5 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-mango-200">
                Customer order note
              </h3>
              <p className="mt-2 text-sm text-rice-100 whitespace-pre-wrap">{order.notes}</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Totals</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-rice-300">
                <dt>Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              {order.discount ? (
                <div className="flex justify-between text-rice-300">
                  <dt>Discount {order.promoCode ? `(${order.promoCode})` : ""}</dt>
                  <dd>−{money(order.discount)}</dd>
                </div>
              ) : null}
              {order.deliveryFee ? (
                <div className="flex justify-between text-rice-300">
                  <dt>Delivery fee</dt>
                  <dd>{money(order.deliveryFee)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-rice-300">
                <dt>Tax</dt>
                <dd>{money(order.tax)}</dd>
              </div>
              {order.tip ? (
                <div className="flex justify-between text-mango-200">
                  <dt>Tip</dt>
                  <dd>{money(order.tip)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold text-rice-50">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Customer</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-semibold text-rice-50">{order.customerName}</p>
              <p>
                <a className="text-ocean-300 hover:underline" href={`mailto:${order.customerEmail}`}>
                  {order.customerEmail}
                </a>
              </p>
              <p>
                <a className="text-ocean-300 hover:underline" href={`tel:${order.customerPhone}`}>
                  {order.customerPhone}
                </a>
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Update status</h3>
            <select
              className="mt-3 w-full rounded-lg border border-white/10 bg-charcoal-900 px-3 py-2 text-sm text-rice-50"
              value={order.orderStatus}
              disabled={updating}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-rice-500">
              Setting to <span className="font-semibold">completed</span> or{" "}
              <span className="font-semibold">cancelled</span> sends an email to the customer (Mailgun, dedup-ed per
              status).
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Payment</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-rice-500">Payment status</dt>
                <dd className="text-rice-200 capitalize">{order.paymentStatus}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-rice-500">Serving mode</dt>
                <dd className="text-rice-200">
                  {(order.servingMode || order.orderType || "in_store_pickup").replace(/_/g, " ")}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-rice-500">Stripe Checkout session</dt>
                <dd className="font-mono text-[10px] text-rice-300 break-all">
                  {order.stripeCheckoutSessionId || "—"}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-rice-500">Stripe payment intent</dt>
                <dd className="font-mono text-[10px] text-rice-300 break-all">
                  {order.stripePaymentIntentId || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-rice-300">Email</h3>
            <ul className="mt-3 space-y-1 text-xs text-rice-300">
              <li>
                Customer confirmation:{" "}
                <span className={order.confirmationEmailSent ? "text-avocado-300" : "text-rice-500"}>
                  {order.confirmationEmailSent ? "sent" : order.confirmationEmailStatus || "not sent"}
                </span>
              </li>
              <li>
                Kitchen notification:{" "}
                <span className={order.merchantNotificationEmailSent ? "text-avocado-300" : "text-rice-500"}>
                  {order.merchantNotificationEmailSent ? "sent" : "not sent"}
                </span>
              </li>
              {order.confirmationEmailError ? (
                <li className="text-coral-300">Error: {order.confirmationEmailError}</li>
              ) : null}
              {order.statusEmailLog?.length ? (
                <li className="pt-2">
                  <p className="text-[10px] uppercase tracking-wide text-rice-500">Status emails sent</p>
                  <ul className="mt-1 space-y-0.5">
                    {order.statusEmailLog.map((entry, idx) => (
                      <li key={idx}>
                        <span className="capitalize text-rice-200">{entry.status}</span>{" "}
                        <span className="text-rice-500">— {formatDate(entry.sentAt)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
