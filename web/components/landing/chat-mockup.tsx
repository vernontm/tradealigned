"use client";

/**
 * Static-feeling Mentor Chat mockup for the landing page. Shows a typed-out
 * student question, Ray's first-person answer, and a Lesson preview card
 * that surfaces a real-looking course video moment.
 */
import { GraduationCap, MessageSquare, Send, Sparkles } from "lucide-react";

export function ChatMockup() {
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
            <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
            Mentor Chat
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
          live · Ray AI
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-3 px-4 py-4">
        {/* student bubble */}
        <div className="ml-auto max-w-[78%] space-y-1">
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 px-3.5 py-2.5 text-sm text-white shadow">
            in the wick algorithm video, what does Ray mean by trailing under the
            wick lows?
          </div>
          <div className="text-right text-[9px] text-zinc-600">you · just now</div>
        </div>

        {/* Ray bubble */}
        <div className="max-w-[82%] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
              <Sparkles className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
            </span>
            Ray
          </div>
          <div className="rounded-2xl rounded-bl-md border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-200">
            instead of setting a hard 1:2 or 1:3 risk-reward, you trail your stop
            under each new wick low as the candles close. that way you give the
            move room to run while protecting profit. I walk through this
            exact pattern in the video, let me drop it for you.
          </div>
        </div>

        {/* Lesson preview card */}
        <div className="ml-7 max-w-[82%] rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3 ring-1 ring-violet-400/10">
          <div className="flex items-start gap-2">
            <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white">
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-100">
                trailing stop via wicks
              </div>
              <div className="truncate text-[10px] text-zinc-500">
                from <strong className="text-zinc-300">The Wick Algorithm For Price Action Trading</strong> · 12:18, 13:24
              </div>
            </div>
          </div>
          {/* Chart-thumbnail preview for the cited lesson moment. Uses a
              hand-drawn SVG candle series so it reads as a real chart
              screenshot without a heavy image asset, plus a faint timeline
              with a cued red marker at 12:18 to match the citation. */}
          <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-white/5">
            {/* Gradient backdrop, like a TradingView dark theme */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15,118,110,0.18) 0%, rgba(8,47,73,0.35) 60%, rgba(9,9,11,0.85) 100%)",
              }}
            />
            {/* Grid lines */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
            >
              <line x1="0" x2="200" y1="25" y2="25" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" x2="200" y1="50" y2="50" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" x2="200" y1="75" y2="75" stroke="rgba(255,255,255,0.05)" />
            </svg>
            {/* Candle silhouette, bullish uptrend with the wick the gem
                quote talks about, drawn at scale into the viewBox. */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
            >
              {/* Wick + body candle helper coordinates */}
              {[
                { x: 14, oc: [62, 70], wick: [56, 76], up: false },
                { x: 26, oc: [66, 60], wick: [55, 72], up: true },
                { x: 38, oc: [58, 52], wick: [48, 64], up: true },
                { x: 50, oc: [55, 60], wick: [50, 66], up: false },
                { x: 62, oc: [60, 48], wick: [44, 64], up: true },
                { x: 74, oc: [50, 44], wick: [38, 56], up: true },
                { x: 86, oc: [46, 50], wick: [42, 58], up: false },
                { x: 98, oc: [50, 38], wick: [33, 56], up: true },
                { x: 110, oc: [40, 34], wick: [28, 46], up: true },
                { x: 122, oc: [36, 42], wick: [32, 48], up: false },
                { x: 134, oc: [42, 30], wick: [25, 48], up: true },
                { x: 146, oc: [32, 26], wick: [20, 38], up: true },
                { x: 158, oc: [28, 32], wick: [24, 38], up: false },
                { x: 170, oc: [32, 22], wick: [16, 38], up: true },
                { x: 182, oc: [22, 18], wick: [12, 28], up: true },
              ].map((c, i) => {
                const color = c.up ? "#34d399" : "#fb7185";
                const [openY, closeY] = c.oc;
                const [highY, lowY] = c.wick;
                const top = Math.min(openY, closeY);
                const bodyH = Math.max(1.5, Math.abs(closeY - openY));
                return (
                  <g key={i}>
                    <line
                      x1={c.x}
                      x2={c.x}
                      y1={highY}
                      y2={lowY}
                      stroke={color}
                      strokeWidth={1}
                    />
                    <rect
                      x={c.x - 3}
                      y={top}
                      width={6}
                      height={bodyH}
                      fill={color}
                      rx={0.5}
                    />
                  </g>
                );
              })}
              {/* Wick low trailing stop marker, the gem's whole point */}
              <line
                x1="20"
                x2="190"
                y1="48"
                y2="32"
                stroke="rgba(244,63,94,0.6)"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              <text
                x="146"
                y="44"
                fontSize="5"
                fill="rgba(244,63,94,0.9)"
                fontFamily="monospace"
              >
                trailing SL under wick lows
              </text>
            </svg>
            {/* Time-cue marker matching the cited "12:18" timestamp */}
            <div className="absolute inset-x-0 bottom-1.5 flex items-center gap-1 px-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[44%] bg-gradient-to-r from-emerald-500/70 to-emerald-300/70" />
              </div>
              <span className="font-mono text-[8px] text-zinc-300">12:18</span>
            </div>
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-lg">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1 L9 5 L2 9 Z" />
                </svg>
              </div>
            </div>
            {/* Bottom-left caption */}
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[8px] font-mono text-emerald-200 ring-1 ring-emerald-400/20">
              <span className="h-1 w-1 rounded-full bg-emerald-300" />
              Wick Algorithm
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-zinc-900/60 px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5">
          <input
            readOnly
            placeholder="ask anything, drop a chart…"
            className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 outline-none"
          />
          <button
            disabled
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
          >
            <Send className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
