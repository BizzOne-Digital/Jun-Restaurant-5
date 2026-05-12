"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore, cartSubtotal } from "@/lib/store/cart-store";
import { AnimatedPage } from "@/components/site/animated-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/site/empty-state";
import Link from "next/link";
import { toast } from "sonner";
import { hasMinPhoneDigits, suggestEmailTypo } from "@/lib/email-validation";

type TipMode = "none" | "p15" | "p20" | "p25" | "custom";

const TIP_PERCENTS: Record<Exclude<TipMode, "none" | "custom">, number> = {
  p15: 0.15,
  p20: 0.2,
  p25: 0.25,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const items = useCartStore((s) => s.items);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [promo, setPromo] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [tipMode, setTipMode] = React.useState<TipMode>("none");
  const [customTip, setCustomTip] = React.useState("");
  const emailSuggestion = React.useMemo(() => suggestEmailTypo(email), [email]);

  const subtotal = React.useMemo(() => cartSubtotal(items), [items]);

  const tipAmount = React.useMemo(() => {
    if (tipMode === "none") return 0;
    if (tipMode === "custom") {
      const v = Number(customTip);
      if (!Number.isFinite(v) || v < 0) return 0;
      return round2(Math.min(v, 999));
    }
    return round2(subtotal * TIP_PERCENTS[tipMode]);
  }, [tipMode, customTip, subtotal]);

  React.useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [status, session]);

  React.useEffect(() => {
    if (searchParams.get("cancelled")) {
      toast.message("Checkout cancelled — your cart is still here.");
    }
  }, [searchParams]);

  const submit = async () => {
    if (!items.length) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2) {
      toast.error("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!hasMinPhoneDigits(trimmedPhone)) {
      toast.error("Please enter a valid phone number (minimum 7 digits).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          promoCode: promo || undefined,
          notes,
          tip: tipAmount > 0 ? tipAmount : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Unable to start checkout");
        if (data.emailSuggestion) {
          toast.message(`Did you mean ${data.emailSuggestion}?`);
        }
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <AnimatedPage>
        <div className="mx-auto max-w-xl px-4 py-20">
          <EmptyState
            title="Nothing to checkout"
            description="Add items from the menu, then return here to pay securely with Stripe."
            action={
              <Link href="/menu">
                <Button>Back to menu</Button>
              </Link>
            }
          />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
        <h1 className="font-display text-3xl text-rice-50 sm:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-rice-400">
          Pickup only · In-store pickup. Payments are processed by Stripe — never trust the browser alone.
        </p>

        <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-rice-400">
              Full name
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-rice-400">
              Email
              <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {emailSuggestion ? (
              <button
                type="button"
                className="text-left text-xs text-mango-300 hover:underline md:col-span-2"
                onClick={() => setEmail(emailSuggestion)}
              >
                Did you mean {emailSuggestion}?
              </button>
            ) : null}
            <label className="text-xs font-semibold uppercase tracking-wide text-rice-400 md:col-span-2">
              Phone
              <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-charcoal-900/40 p-4">
            <p className="text-base font-semibold text-rice-50">Tip</p>
            <p className="mt-1 text-xs text-rice-400">
              Percentages are based on your order subtotal (before tax).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { mode: "none" as const, label: "No tip" },
                  { mode: "p15" as const, label: `15% (${formatMoney(round2(subtotal * 0.15))})` },
                  { mode: "p20" as const, label: `20% (${formatMoney(round2(subtotal * 0.2))})` },
                  { mode: "p25" as const, label: `25% (${formatMoney(round2(subtotal * 0.25))})` },
                  { mode: "custom" as const, label: "Custom" },
                ] as const
              ).map((opt) => {
                const active = tipMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => {
                      setTipMode(opt.mode);
                      if (opt.mode !== "custom") setCustomTip("");
                    }}
                    className={
                      "rounded-full px-4 py-2 text-xs font-semibold transition " +
                      (active
                        ? "bg-mango-300 text-charcoal-900 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                        : "border border-white/10 bg-white/[0.04] text-rice-100 hover:bg-white/[0.08]")
                    }
                    aria-pressed={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {tipMode === "custom" ? (
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-rice-400">
                Custom tip amount (CAD)
                <Input
                  className="mt-1 max-w-[200px]"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={999}
                  step="0.01"
                  placeholder="0.00"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                />
              </label>
            ) : null}
            {tipAmount > 0 ? (
              <p className="mt-3 text-xs text-rice-400">
                Tip added: <span className="font-semibold text-mango-300">{formatMoney(tipAmount)}</span>
              </p>
            ) : null}
          </div>

          <label className="text-xs font-semibold uppercase tracking-wide text-rice-400">
            Promo code (optional)
            <Input className="mt-1" value={promo} onChange={(e) => setPromo(e.target.value)} />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-rice-400">
            Order notes
            <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <Button
            className="w-full"
            size="lg"
            type="button"
            disabled={loading || !name || !email || !phone}
            onClick={submit}
          >
            {loading ? "Redirecting…" : "Pay with Stripe"}
          </Button>
        </div>
      </div>
    </AnimatedPage>
  );
}
