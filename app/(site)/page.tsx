"use client";

import Link from "next/link";
import { Hero } from "@/components/site/hero";
import { AnimatedPage } from "@/components/site/animated-page";
import { Button } from "@/components/ui/button";
import { HomeFeatured } from "@/components/site/home-featured";
import { motion } from "framer-motion";

const reviews = [
  { name: "Alex M.", quote: "Bright, fresh, and ridiculously satisfying — my weekly go-to.", stars: 5 },
  { name: "Priya S.", quote: "Feels premium without being fussy. The torched bowls are unreal.", stars: 5 },
  { name: "Jordan L.", quote: "Perfect post-gym fuel. Love the mango-salmon combo.", stars: 5 },
];

export default function HomePage() {
  return (
    <AnimatedPage>
      <div
        className="bg-cover bg-center bg-no-repeat bg-scroll md:bg-fixed"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10, 17, 24, 0.76), rgba(10, 17, 24, 0.82)), url('/images/home/home-background.png')",
        }}
      >
        <Hero />

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mango-300">Featured bowls</p>
            <h2 className="font-display text-2xl text-rice-50 sm:text-3xl md:text-4xl">Island flavours, chef-built balance</h2>
          </div>
          <Link href="/menu">
            <Button variant="outline">Explore full menu</Button>
          </Link>
        </div>
        <HomeFeatured />
        </section>

        <section className="border-y border-white/10 bg-charcoal-900/35 py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-coral-300">Why ONO</p>
            <h3 className="mt-2 font-display text-2xl text-rice-50 sm:text-3xl">Crafted fresh daily</h3>
            <p className="mt-4 text-rice-300">
              We obsess over texture, temperature, and colour — from glistening salmon to snap-fresh vegetables — so
              every bowl feels like a mini escape to the Pacific.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Ocean-sourced proteins", "House-made sauces", "Premium rice & greens", "Made-to-order speed"].map(
              (t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-2xl p-4"
                >
                  <p className="font-semibold text-rice-50">{t}</p>
                  <p className="mt-1 text-sm text-rice-400">Quality-first sourcing & prep — tune copy for your brand voice.</p>
                </motion.div>
              )
            )}
          </div>
        </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-avocado-400">Ingredients</p>
            <h3 className="font-display text-2xl text-rice-50 sm:text-3xl">Colour you can taste</h3>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[
            { title: "Wild-caught feel", body: "Showcase your sourcing story — line-caught, sustainable partners, etc." },
            { title: "Vibrant produce", body: "Crisp cucumber, sweet mango, peppery radish — all camera-ready." },
            { title: "Sauces with soul", body: "Spicy mango, sriracha aioli, unagi tare — balanced, never one-note." },
          ].map((c) => (
            <div key={c.title} className="glass-panel rounded-3xl p-6">
              <p className="font-display text-xl text-mango-200">{c.title}</p>
              <p className="mt-2 text-sm text-rice-300">{c.body}</p>
            </div>
          ))}
        </div>
        </section>

        <section className="bg-charcoal-950/35 py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mango-300">Love letters</p>
          <h3 className="mt-2 font-display text-2xl text-rice-50 sm:text-3xl">Guests are talking</h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.name} className="glass-panel rounded-3xl p-6">
                <p className="text-sm text-mango-300">{"★".repeat(r.stars)}</p>
                <p className="mt-3 text-sm text-rice-200">&ldquo;{r.quote}&rdquo;</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-rice-500">{r.name}</p>
              </div>
            ))}
          </div>
        </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="glass-panel grid gap-6 rounded-[1.5rem] p-5 sm:p-6 md:grid-cols-2 md:gap-8 md:rounded-[2rem] md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-coral-300">Visit</p>
            <h3 className="mt-2 font-display text-2xl text-rice-50 sm:text-3xl">Find us in Georgetown</h3>
            <p className="mt-4 text-rice-200">
              369 Mountainview Rd S #5
              <br />
              Georgetown, ON L7G 5X3
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ocean-900/40">
            <iframe
              title="ONO Poké Bar Georgetown map"
              className="h-56 w-full sm:h-64 md:h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=369+Mountainview+Rd+S+%235+Georgetown+ON+L7G+5X3&output=embed"
            />
          </div>
        </div>
        </section>
      </div>
    </AnimatedPage>
  );
}
