"use client";

/**
 * Static visual of the Gems library, three pinned teaching moments laid out
 * like the live /gems grid. No fetch; the cards are hand-tuned to look like
 * authentic Ray quotes.
 */
import { Gem, Play } from "lucide-react";

type GemCard = {
  concept: string;
  title: string;
  quote: string;
  range: string;
  hue: number;
};

const GEMS: GemCard[] = [
  {
    concept: "patience over prediction",
    title: "Let probability play out",
    quote:
      "detaching from the outcome is the only way to let the law of probability play out in your favor. you will experience both wins and losses until you retire.",
    range: "18:27 → 20:59 · 152s",
    hue: 158,
  },
  {
    concept: "structure-first entries",
    title: "Break range, retest, enter",
    quote:
      "get a break of the last two-candlestick pullback high, which creates a new range. when that range breaks, price returns to the order block that created it.",
    range: "13:32 → 14:39 · 67s",
    hue: 200,
  },
  {
    concept: "risk first, target second",
    title: "Start with half-percent risk",
    quote:
      "if you risk one percent and win three, losing 27 times and winning 23 still puts you in profit. the math works without needing a high win rate.",
    range: "07:10 → 09:18 · 128s",
    hue: 270,
  },
];

export function GemsMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl ring-1 ring-white/5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-zinc-900/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500/60" />
            <span className="h-2 w-2 rounded-full bg-amber-500/60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            <Gem className="h-3 w-3" strokeWidth={2.5} />
            Gems
          </div>
        </div>
        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-200 ring-1 ring-violet-400/30">
          399 gems indexed
        </span>
      </div>

      {/* Grid */}
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {GEMS.map((g) => (
          <div
            key={g.title}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 p-3"
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
              style={{
                background: `hsla(${g.hue},80%,60%,0.18)`,
              }}
            />
            <div className="relative flex items-start gap-2">
              <div
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow"
                style={{
                  background: `linear-gradient(135deg, hsl(${g.hue},80%,55%), hsl(${(g.hue + 40) % 360},80%,40%))`,
                }}
              >
                <Gem className="h-3 w-3" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {g.concept}
                </div>
                <div className="line-clamp-1 text-xs font-semibold text-zinc-100">
                  {g.title}
                </div>
              </div>
            </div>
            <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md bg-zinc-950 ring-1 ring-white/5">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(closest-side, hsla(${g.hue},80%,40%,0.45), transparent 70%)`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow">
                  <Play className="h-3 w-3" strokeWidth={3} fill="currentColor" />
                </div>
              </div>
            </div>
            <p className="relative mt-2 line-clamp-3 text-[10px] italic leading-relaxed text-zinc-400">
              &ldquo;{g.quote}&rdquo;
            </p>
            <div className="relative mt-1.5 text-[9px] font-mono text-zinc-600">
              {g.range}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
