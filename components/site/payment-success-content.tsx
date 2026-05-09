"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart-store";

type SessionStatusPayload = {
  success: boolean;
  paymentStatus: string;
  orderNumber?: string;
  orderStatus?: string;
  error?: string;
  paymentErrorMessage?: string;
};

function ConfirmationShell({
  children,
  showCheck,
}: {
  children: React.ReactNode;
  showCheck?: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      className="glass-panel rounded-[1.5rem] p-6 text-left sm:rounded-[2rem] sm:p-10"
    >
      <div className="text-center">
        {showCheck ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-avocado-500 to-ocean-400 text-3xl text-charcoal-900"
          >
            ✓
          </motion.div>
        ) : (
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl text-mango-300">
            ◆
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
}

const DEFAULT_PREP_MINUTES = 20;

function formatPrepWindow(minutes: number): string {
  const m = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : DEFAULT_PREP_MINUTES;
  return `${m} ${m === 1 ? "minute" : "minutes"}`;
}

export function PaymentSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = React.useState<"idle" | "loading" | "ok" | "error">("idle");
  const [payload, setPayload] = React.useState<SessionStatusPayload | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [prepMinutes, setPrepMinutes] = React.useState<number>(DEFAULT_PREP_MINUTES);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const v = d?.settings?.pickupPrepareTimeMinutes;
        if (typeof v === "number" && Number.isFinite(v) && v > 0) {
          setPrepMinutes(v);
        }
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!sessionId) {
      setState("idle");
      return;
    }
    setState("loading");
    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((r) => r.json())
      .then((d: SessionStatusPayload) => {
        if (!d.success) {
          setPayload(d);
          setErrorMessage(d.paymentErrorMessage || d.error || "Payment could not be confirmed.");
          setState("error");
          return;
        }
        setPayload(d);
        setState("ok");
        if (d.paymentStatus === "paid") {
          useCartStore.getState().clear();
        }
      })
      .catch(() => {
        setPayload(null);
        setErrorMessage("Payment could not be confirmed.");
        setState("error");
      });
  }, [sessionId]);

  const paid = payload?.paymentStatus === "paid";

  const actions = (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
      <Link href="/menu" className="sm:flex-1 sm:max-w-[220px]">
        <Button className="w-full" size="lg" variant="outline">
          Back to Menu
        </Button>
      </Link>
      <Link href="/account/orders" className="sm:flex-1 sm:max-w-[220px]">
        <Button className="w-full" size="lg">
          View My Orders
        </Button>
      </Link>
    </div>
  );

  const sessionFootnote =
    sessionId != null ? (
      <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-rice-600 break-all">
        Ref: {sessionId}
      </p>
    ) : null;

  /** No session_id — still render full page (never blank). */
  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <ConfirmationShell showCheck={false}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mango-300">ONO Poké Bar</p>
          <h1 className="mt-2 font-display text-2xl text-rice-50 sm:text-3xl">Thanks for stopping by</h1>
          <p className="mt-3 text-sm leading-relaxed text-rice-400">
            We couldn&apos;t read your checkout link (missing session reference). If you just paid, check your email for
            confirmation from the restaurant, or open the link from your Stripe receipt.
          </p>
          {actions}
        </ConfirmationShell>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-20">
        <p className="text-sm text-rice-300">Confirming your payment…</p>
        <p className="mt-2 text-xs text-rice-500">Pickup only · In-store pickup</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <ConfirmationShell showCheck>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mango-300">ONO Poké Bar</p>
          <h1 className="mt-2 font-display text-2xl text-rice-50 sm:text-3xl">We could not confirm your payment yet.</h1>
          <p className="mt-3 text-sm leading-relaxed text-rice-300">
            {errorMessage || "Please wait a moment and refresh this page. If payment has completed, this screen will update once the server verifies Stripe."}
          </p>
          {sessionFootnote}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/cart">
              <Button variant="outline">Back to Cart</Button>
            </Link>
            <Link href="/menu">
              <Button>Back to Menu</Button>
            </Link>
          </div>
        </ConfirmationShell>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <ConfirmationShell showCheck>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mango-300">ONO Poké Bar</p>
        <h1 className="mt-2 font-display text-2xl text-rice-50 sm:text-3xl">{paid ? "Pickup order confirmed" : "We could not confirm your payment yet."}</h1>
        <p className="mt-3 text-sm leading-relaxed text-rice-300">
          {paid
            ? "Your payment has been received and your order is being prepared for pickup."
            : "Please wait a moment and refresh. We only confirm payment after server-side Stripe verification."}
        </p>
        <p className="mt-4 text-sm text-rice-400">Order <span className="font-semibold text-rice-100">{payload?.orderNumber ?? "—"}</span></p>
        <p className="mt-4 text-center text-sm text-rice-400">
          Estimated pickup time: <span className="font-semibold text-mango-300">{formatPrepWindow(prepMinutes)}</span>
        </p>
        <p className="mt-1 text-center text-xs text-rice-500">Pickup only · In-store pickup</p>

        {sessionFootnote}
        {actions}
      </ConfirmationShell>
    </div>
  );
}
