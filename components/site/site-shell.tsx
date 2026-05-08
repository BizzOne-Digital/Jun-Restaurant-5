"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, cartSubtotal } from "@/lib/store/cart-store";
import { cn } from "@/lib/cn";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = cartSubtotal(items);
  const hideBar =
    pathname.startsWith("/checkout") || pathname.startsWith("/success") || pathname.startsWith("/payment-success");
  const showBar = !hideBar && count > 0;

  return (
    <>
      {children}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-0 bottom-16 z-40 border-t border-white/10 bg-charcoal-900/90 p-3 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-rice-400">{count} items</p>
                <p className="font-display text-lg text-mango-300">${subtotal.toFixed(2)}</p>
              </div>
              <Link
                href="/cart"
                className={cn(
                  "rounded-full bg-gradient-to-r from-coral-500 to-mango-500 px-5 py-2 text-sm font-bold text-charcoal-900",
                  "shadow-lift"
                )}
              >
                View cart
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
