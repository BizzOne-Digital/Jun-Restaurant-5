"use client";

import * as React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { playOrderNotificationSound } from "@/lib/orderSound";

const LS_ALERTS = "ono-admin-order-alerts-enabled";

type Order = {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  stripePaymentIntentId?: string;
  createdAt: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [q, setQ] = React.useState("");
  const [alertsEnabled, setAlertsEnabled] = React.useState(false);
  const initialLoadRef = React.useRef(true);
  /** Order IDs that were already observed as paid on a previous poll.
   * A new id appearing in the paid set on a later poll means the payment just
   * succeeded — that's when we want the chime to fire. */
  const seenPaidIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    try {
      setAlertsEnabled(localStorage.getItem(LS_ALERTS) === "1");
    } catch {
      setAlertsEnabled(false);
    }
  }, []);

  const setAlerts = (on: boolean) => {
    setAlertsEnabled(on);
    try {
      if (on) localStorage.setItem(LS_ALERTS, "1");
      else localStorage.removeItem(LS_ALERTS);
    } catch {
      /* ignore */
    }
  };

  const enableAlertsWithUnlock = async () => {
    setAlerts(true);
    try {
      const audio = new Audio("/sounds/order-notification.mp3");
      audio.volume = 0.01;
      await audio.play();
      audio.pause();
    } catch {
      /* still enable — real alerts use playOrderNotificationSound */
    }
  };

  const load = React.useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/admin/orders?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }, [q]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!alertsEnabled || q.trim()) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [alertsEnabled, q, load]);

  React.useEffect(() => {
    const currentPaidIds = orders
      .filter((o) => o.paymentStatus === "paid")
      .map((o) => o._id);

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      seenPaidIdsRef.current = new Set(currentPaidIds);
      return;
    }

    const newlyPaidIds = currentPaidIds.filter((id) => !seenPaidIdsRef.current.has(id));
    if (alertsEnabled && newlyPaidIds.length > 0) {
      playOrderNotificationSound();
    }
    seenPaidIdsRef.current = new Set(currentPaidIds);
  }, [orders, alertsEnabled]);

  const updateStatus = async (id: string, orderStatus: string) => {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-display text-2xl">Orders</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {!alertsEnabled ? (
            <button
              type="button"
              className="rounded-full border border-mango-400/40 bg-mango-400/10 px-4 py-2 text-left text-xs font-semibold text-mango-200 hover:bg-mango-400/20"
              onClick={enableAlertsWithUnlock}
            >
              Enable order alerts
              <span className="mt-0.5 block font-normal text-rice-500">Plays a sound when a new order is paid (saved on this device).</span>
            </button>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-rice-300">
              <input type="checkbox" checked={alertsEnabled} onChange={(e) => setAlerts(e.target.checked)} className="rounded border-white/20" />
              Order alerts on
            </label>
          )}
          <div className="flex gap-2">
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="md:w-72" />
            <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold" onClick={load}>
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="hidden min-w-full text-left text-sm md:table">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-rice-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stripe PI</th>
              <th className="px-4 py-3">Update</th>
              <th className="px-4 py-3">View</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-semibold text-rice-100">
                  <Link
                    href={`/admin/orders/${o._id}`}
                    className="text-rice-50 hover:underline"
                    title="View order details"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-rice-300">
                  {o.customerName}
                  <div className="text-xs text-rice-500">{o.customerEmail}</div>
                </td>
                <td className="px-4 py-3">${o.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.paymentStatus} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.orderStatus} />
                </td>
                <td className="px-4 py-3 text-xs text-rice-500">{o.stripePaymentIntentId || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-white/10 bg-charcoal-900 px-2 py-1 text-xs"
                    value={o.orderStatus}
                    onChange={(e) => updateStatus(o._id, e.target.value)}
                  >
                    {["pending", "paid", "preparing", "ready", "completed", "cancelled", "refunded"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o._id}`}
                    className="text-xs font-semibold text-ocean-300 hover:underline"
                  >
                    Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divide-y divide-white/5 md:hidden">
          {orders.map((o) => (
            <div key={o._id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/orders/${o._id}`}
                    className="font-semibold text-rice-50 hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="text-sm text-rice-300">{o.customerName}</p>
                  <p className="text-xs text-rice-500">{o.customerEmail}</p>
                </div>
                <p className="font-semibold text-mango-300">${o.total.toFixed(2)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={o.paymentStatus} />
                <StatusBadge status={o.orderStatus} />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-rice-500">Update:</p>
                <select
                  className="flex-1 rounded-lg border border-white/10 bg-charcoal-900 px-2 py-1.5 text-xs"
                  value={o.orderStatus}
                  onChange={(e) => updateStatus(o._id, e.target.value)}
                >
                  {["pending", "paid", "preparing", "ready", "completed", "cancelled", "refunded"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                href={`/admin/orders/${o._id}`}
                className="inline-block text-xs font-semibold text-ocean-300 hover:underline"
              >
                View order details →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
