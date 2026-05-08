"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/lib/store/cart-store";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/build", label: "Build" },
  { href: "/cart", label: "Cart" },
  { href: "/account", label: "Account" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <>
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-white/10 bg-charcoal-900/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-rice-50/90 p-1 shadow-glass sm:h-11 sm:w-11">
              <Image src="/images/logo.png" alt="ONO Poké Bar logo" fill className="object-contain p-0.5" priority />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-sm font-semibold tracking-tight text-rice-50 sm:text-lg">ONO Poké Bar</p>
              <p className="truncate text-[10px] uppercase tracking-[0.15em] text-mango-300/90 sm:text-[11px] sm:tracking-[0.2em]">Toronto</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
                    ? "bg-white/10 text-rice-50"
                    : "text-rice-200/80 hover:bg-white/5 hover:text-rice-50"
                )}
              >
                {l.label}
                {l.href === "/cart" && count > 0 && (
                  <span className="ml-1 rounded-full bg-coral-500 px-2 py-0.5 text-[11px] font-bold text-charcoal-900">
                    {count}
                  </span>
                )}
              </Link>
            ))}
            {session?.user && (
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-medium text-rice-200/80 transition-colors hover:bg-white/5 hover:text-rice-50"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            )}
            {session?.user?.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-full px-4 py-2 text-sm font-semibold text-mango-300 hover:bg-white/5"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Mobile cart button in header */}
          <Link
            href="/cart"
            className="relative rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold md:hidden"
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </div>
      </motion.header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-charcoal-900/90 backdrop-blur-xl md:hidden">
        <div className="flex items-stretch">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  active ? "text-mango-300" : "text-rice-400"
                )}
              >
                {l.href === "/cart" && count > 0 && (
                  <span className="absolute right-[calc(50%-18px)] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-charcoal-900">
                    {count}
                  </span>
                )}
                <span className="text-base leading-none">
                  {l.href === "/menu" && "🍱"}
                  {l.href === "/build" && "🥣"}
                  {l.href === "/cart" && "🛒"}
                  {l.href === "/account" && "👤"}
                </span>
                {l.label}
              </Link>
            );
          })}
          {session?.user && (
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-rice-400 transition-colors hover:text-rice-50"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <span className="text-base leading-none">🚪</span>
              Sign out
            </button>
          )}
          {session?.user?.role === "admin" && (
            <Link
              href="/admin"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-mango-300"
            >
              <span className="text-base leading-none">⚙️</span>
              Admin
            </Link>
          )}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind mobile tab bar */}
      <div className="h-14 md:hidden" />
    </>
  );
}
