"use client";

/**
 * Small inline UI card that anchors the center of the hero beam, modelled on
 * the VoltX "Buy Crypto Using USD" widget. For Ray AI it shows a one-line
 * student question + the first sentence of Ray's reply with a "view full
 * answer" link, gives the page a glimpse of the actual product the moment
 * the user looks at the hero.
 */

import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";

export function HeroPromptCard() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* Glow halo */}
      <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-emerald-400/30 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-emerald-300/30 bg-zinc-950/90 shadow-2xl ring-1 ring-emerald-200/10 backdrop-blur-md">
        {/* Top accent bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/80 px-4 py-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
            <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
            ask Ray
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        </div>

        {/* Q + A */}
        <div className="space-y-3 px-4 py-4">
          <div className="rounded-xl bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              you
            </span>
            <div className="mt-0.5">
              what does Ray mean by &ldquo;wick algorithm&rdquo;?
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow shadow-emerald-500/40">
              <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 rounded-xl rounded-tl-md bg-gradient-to-br from-emerald-500/20 to-teal-500/10 px-3 py-2 text-sm text-emerald-50 ring-1 ring-emerald-400/30">
              you trail your stop under the wick low of each new bullish candle.
              that way the move has room to run while you protect profit. I
              show this in <em>Wick Algorithm</em> at 12:18.
            </div>
          </div>
        </div>

        {/* CTA bar */}
        <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-emerald-500/[0.06] px-4 py-2.5">
          <span className="text-[10px] text-zinc-500">
            grounded in Ray&apos;s real lessons
          </span>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 py-1 text-[11px] font-bold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
          >
            try it free
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
