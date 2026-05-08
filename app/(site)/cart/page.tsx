"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCartStore, cartSubtotal } from "@/lib/store/cart-store";
import { QuantitySelector } from "@/components/site/quantity-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/site/empty-state";
import { AnimatedPage } from "@/components/site/animated-page";

const TAX_RATE = 0.13;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const [promo, setPromo] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const subtotal = cartSubtotal(items);
  const discount = 0;
  const deliveryFee = 0;
  const taxable = Math.max(0, subtotal - discount) + deliveryFee;
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;

  if (!items.length) {
    return (
      <AnimatedPage>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <EmptyState
            title="Your cart is empty"
            description="Add a signature bowl or build your own masterpiece."
            action={
              <Link href="/menu">
                <Button>Browse menu</Button>
              </Link>
            }
          />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <h1 className="font-display text-3xl text-rice-50 sm:text-4xl">Your cart</h1>
        <p className="mt-2 text-sm text-rice-400">Review items before secure Stripe checkout.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {items.map((line, idx) => (
              <motion.div
                layout
                key={`${line.name}-${idx}`}
                className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:gap-4"
              >
                <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-ocean-900/40 sm:h-24 sm:w-28">
                  {line.image && <Image src={line.image} alt="" fill className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-rice-50">{line.name}</p>
                      {line.isBuildBowl && <p className="text-xs text-mango-300">Custom bowl</p>}
                    </div>
                    <button type="button" className="text-xs text-coral-300 hover:underline" onClick={() => removeItem(idx)}>
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <QuantitySelector value={line.quantity} onChange={(n) => setQty(idx, n)} />
                    <p className="font-display text-lg text-mango-300">${(line.price * line.quantity).toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-panel h-fit rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mango-300">Summary</p>
            <p className="mt-2 text-xs text-rice-500">Pickup only · In-store pickup</p>
            <div className="mt-4 space-y-2 text-sm text-rice-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Promo</span>
                <span className="text-rice-500">Applied at checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} />
              </div>
              <div className="flex justify-between">
                <span>Tax (placeholder)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pickup</span>
                <span className="text-rice-200">In-store</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-rice-50">
                <span>Estimated total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-rice-400">
              Notes for the restaurant
              <textarea
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-rice-50 outline-none focus:ring-2 focus:ring-ocean-400/40"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <Link href="/checkout" className="mt-6 block">
              <Button className="w-full" size="lg" type="button">
                Proceed to checkout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
