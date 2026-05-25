"use client";

import Link from "next/link";
import { motion } from "framer-motion";

function BagIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className} aria-hidden>
      <path d="M6 7h12l-1 12H7L6 7z" strokeLinejoin="round" />
      <path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={props.className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center gap-10 px-4 pb-14 pt-20 md:min-h-[88vh] md:flex-row md:items-center md:gap-10 md:px-6 md:pb-20 md:pt-28">
        <div className="mx-auto w-full max-w-xl space-y-6 md:mx-0">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mango-200 md:px-4 md:text-xs md:tracking-[0.25em]"
          >
            Georgetown · Fresh daily
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="font-display text-center text-3xl font-semibold leading-tight text-rice-50 sm:text-4xl md:text-left md:text-6xl"
          >
            Fresh Poké. <span className="text-gradient-warm">Bold Flavour.</span>
            <br />
            Island Energy.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-base text-rice-200/90 md:text-left md:text-xl"
          >
            Premium poké bowls crafted fresh in Georgetown — vibrant ingredients, chef-level balance, and a dining
            experience that feels as good as it tastes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22, type: "spring", stiffness: 120, damping: 18 }}
            className="flex flex-col items-center gap-3 pt-2 md:items-start"
          >
            <Link href="/menu" className="group relative w-full max-w-md md:max-w-none">
              <span
                className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-coral-500 via-mango-400 to-avocado-500 opacity-75 blur-lg transition duration-500 group-hover:opacity-100 group-hover:blur-xl"
                aria-hidden
              />
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="relative flex h-14 w-full min-h-[56px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-coral-500 via-mango-400 to-avocado-500 px-10 text-base font-extrabold tracking-wide text-charcoal-900 shadow-[0_0_40px_-4px_rgba(255,107,92,0.55),0_12px_40px_-8px_rgba(0,0,0,0.45)] ring-2 ring-white/25 transition-shadow duration-300 group-hover:shadow-[0_0_52px_-2px_rgba(255,194,51,0.55),0_16px_48px_-8px_rgba(0,0,0,0.5)] md:h-16 md:min-h-[64px] md:px-12 md:text-lg"
              >
                <BagIcon className="h-5 w-5 shrink-0 md:h-6 md:w-6" />
                PickUp Order Now
                <ArrowIcon className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 md:h-6 md:w-6" />
              </motion.span>
            </Link>
            <p className="text-center text-xs font-medium text-rice-400/95 md:text-left">Pickup only · Freshly prepared</p>
            <Link
              href="/menu"
              className="mt-1 inline-flex w-full max-w-md items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-rice-100 backdrop-blur-md transition hover:border-white/35 hover:bg-white/10 md:w-auto md:px-8"
            >
              View Menu
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 90 }}
          className="relative mx-auto flex h-[260px] w-full max-w-md items-center justify-center sm:h-[320px] md:h-[420px]"
        >
          <div className="absolute inset-4 rounded-[1.5rem] border border-white/15 bg-white/5 shadow-lift backdrop-blur-xl sm:inset-6 sm:rounded-[2rem]" />
          <div className="relative grid max-w-sm grid-cols-2 gap-2 p-5 sm:gap-3 sm:p-8">
            {["Salmon", "Mango", "Avocado", "Tuna"].map((label, idx) => (
              <motion.div
                key={label}
                className="glass-panel flex flex-col justify-between rounded-xl p-3 sm:rounded-2xl sm:p-4"
                animate={{ y: [0, idx % 2 === 0 ? -8 : 8, 0] }}
                transition={{ duration: 5 + idx, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-xs uppercase tracking-widest text-rice-400">{label}</span>
                <span className="font-display text-xl text-rice-50 sm:text-2xl">{idx + 4}★</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
