"use client";

/**
 * Inline chat preview that anchors the center of the hero. Plays an animated
 * loop: student types a question, AI types a reply, AI attaches a clipped
 * screenshot from the source lesson, hold, reset.
 */

import { ArrowRight, ImageIcon, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Phase =
  | "user-typing"
  | "user-sent"
  | "ai-typing"
  | "ai-text"
  | "ai-screenshot"
  | "hold";

const PHASE_MS: Record<Phase, number> = {
  "user-typing": 1400,
  "user-sent": 600,
  "ai-typing": 1300,
  "ai-text": 900,
  "ai-screenshot": 0,
  hold: 4200,
};

const USER_QUESTION = "what does the wick algorithm mean?";
const AI_REPLY =
  "you trail your stop under the wick low of each new bullish candle. that way the move has room to run while you protect profit. here's the exact frame from Wick Algorithm at 12:18 —";

export function HeroPromptCard() {
  const [phase, setPhase] = useState<Phase>("user-typing");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((p) => {
        const order: Phase[] = [
          "user-typing",
          "user-sent",
          "ai-typing",
          "ai-text",
          "ai-screenshot",
          "hold",
        ];
        const i = order.indexOf(p);
        const next = order[(i + 1) % order.length] as Phase;
        // Reset scroll when looping back to the start.
        if (next === "user-typing" && scrollRef.current) {
          scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
        }
        return next;
      });
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  // After each new chunk of content lands, scroll to the bottom so the user
  // sees the latest message — same feel as a real chat where new replies
  // push older ones up rather than the box growing.
  useEffect(() => {
    if (!scrollRef.current) return;
    if (phase === "user-typing") return; // initial state, stay at top
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [phase]);

  const showUserMsg = phase !== "user-typing";
  const showAiTyping = phase === "ai-typing";
  const showAiText =
    phase === "ai-text" || phase === "ai-screenshot" || phase === "hold";
  const showScreenshot = phase === "ai-screenshot" || phase === "hold";

  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <style>{`
        .hero-prompt-scroll::-webkit-scrollbar { display: none; }
        .hero-prompt-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      {/* Glow halo */}
      <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-emerald-400/30 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-emerald-300/30 bg-zinc-950/90 shadow-2xl ring-1 ring-emerald-200/10 backdrop-blur-md">
        {/* Top accent bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/80 px-4 py-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
            <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
            Trade AI
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        </div>

        {/* Conversation — fixed height with smooth scroll so the card doesn't
            grow when the screenshot drops in; older messages slide up instead. */}
        <div
          ref={scrollRef}
          className="hero-prompt-scroll h-[300px] space-y-3 overflow-y-auto px-4 py-4"
        >
          {/* User bubble: typing dots OR sent message */}
          {showUserMsg ? (
            <div className="rounded-xl bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                you
              </span>
              <div className="mt-0.5">{USER_QUESTION}</div>
            </div>
          ) : (
            <div className="flex justify-end">
              <TypingDots tone="user" />
            </div>
          )}

          {/* AI bubble: appears once user has sent. Shows typing → text → screenshot */}
          {phase !== "user-typing" && phase !== "user-sent" && (
            <div className="flex items-start gap-2">
              <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow shadow-emerald-500/40">
                <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 space-y-2">
                {showAiTyping && (
                  <div className="inline-block rounded-xl rounded-tl-md bg-gradient-to-br from-emerald-500/20 to-teal-500/10 px-3 py-2 ring-1 ring-emerald-400/30">
                    <TypingDots tone="ai" />
                  </div>
                )}
                {showAiText && (
                  <div className="rounded-xl rounded-tl-md bg-gradient-to-br from-emerald-500/20 to-teal-500/10 px-3 py-2 text-sm leading-relaxed text-emerald-50 ring-1 ring-emerald-400/30">
                    {AI_REPLY}
                  </div>
                )}
                {showScreenshot && <WickScreenshot />}
              </div>
            </div>
          )}
        </div>

        {/* CTA bar */}
        <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-emerald-500/[0.06] px-4 py-2.5">
          <span className="text-[10px] text-zinc-500">
            grounded in real TGFX lessons
          </span>
          <Link
            href="#pricing"
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

function TypingDots({ tone }: { tone: "user" | "ai" }) {
  const color = tone === "ai" ? "bg-emerald-300" : "bg-zinc-400";
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${color}`} style={{ animationDelay: "0ms" }} />
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${color}`} style={{ animationDelay: "200ms" }} />
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${color}`} style={{ animationDelay: "400ms" }} />
    </span>
  );
}

/**
 * Stylised "clip" from a teaching video: four ascending bullish candles with
 * the trailing-stop line stepping up under each wick low, an arrow pointing
 * at the most recent stop. Looks like a screenshot the AI pulled from the
 * actual Wick Algorithm lesson.
 */
function WickScreenshot() {
  // Candle layout: x positions, body open/close, wick high/low. Each candle
  // has a higher low than the last so the trailing stop steps up.
  const candles = [
    { x: 28, o: 70, c: 56, hi: 52, lo: 76 },
    { x: 64, o: 56, c: 44, hi: 40, lo: 62 },
    { x: 100, o: 44, c: 30, hi: 26, lo: 50 },
    { x: 136, o: 30, c: 16, hi: 12, lo: 36 },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-400/20 bg-zinc-900/80 ring-1 ring-white/5">
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/60 px-2.5 py-1.5">
        <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          <ImageIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
          Wick Algorithm · 12:18
        </div>
        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
          clip
        </span>
      </div>
      <svg
        viewBox="0 0 200 100"
        className="block w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* faint grid */}
        {[25, 50, 75].map((y) => (
          <line
            key={y}
            x1={6}
            x2={194}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.5}
          />
        ))}

        {/* candles */}
        {candles.map((c, i) => (
          <g key={i}>
            <line
              x1={c.x}
              x2={c.x}
              y1={c.hi}
              y2={c.lo}
              stroke="#34d399"
              strokeWidth={1}
            />
            <rect
              x={c.x - 4}
              y={c.c}
              width={8}
              height={c.o - c.c}
              fill="#34d399"
              rx={1}
            />
          </g>
        ))}

        {/* trailing stop, steps up under each candle's wick low */}
        {candles.map((c, i) => {
          if (i === 0) return null;
          const prev = candles[i - 1];
          return (
            <g key={`sl-${i}`}>
              <line
                x1={prev.x + 4}
                x2={c.x + 4}
                y1={prev.lo + 3}
                y2={prev.lo + 3}
                stroke="#f43f5e"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <line
                x1={c.x + 4}
                x2={c.x + 4}
                y1={prev.lo + 3}
                y2={c.lo + 3}
                stroke="#f43f5e"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            </g>
          );
        })}
        <line
          x1={candles[candles.length - 1].x + 4}
          x2={194}
          y1={candles[candles.length - 1].lo + 3}
          y2={candles[candles.length - 1].lo + 3}
          stroke="#f43f5e"
          strokeWidth={1}
          strokeDasharray="2 2"
        />

        {/* SL label */}
        <g>
          <rect x={168} y={candles[candles.length - 1].lo - 4} rx={2} width={22} height={9} fill="#9f1239" />
          <text
            x={179}
            y={candles[candles.length - 1].lo + 2.5}
            textAnchor="middle"
            fontSize={6}
            fill="#fff"
            fontWeight={700}
            fontFamily="monospace"
          >
            SL
          </text>
        </g>
      </svg>
    </div>
  );
}
