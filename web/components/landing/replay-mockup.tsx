"use client";

/**
 * Animated mockup of the Daily Drill / Replay-Predict game for the landing page.
 *
 * Pure client-side animation with no real data fetches. Cycles through:
 *   1. Candles draw in left → right (the "history" part of the chart).
 *   2. Cursor appears, clicks BUY (round 1) or SELL (round 2).
 *   3. The stop-loss line appears below (or above) the entry.
 *   4. Future candles run, price drives toward TP (win) or stops (loss).
 *   5. WIN / LOSS badge slams in. Stats counter at the top right ticks up.
 *   6. Brief hold, then resets and the next round runs.
 *
 * Built as a state machine driven by a single `tick` interval so the whole
 * sequence stays in sync and the animation can pause when the tab is hidden.
 */

import { ArrowDown, ArrowUp, Loader2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Round = {
  direction: "long" | "short";
  outcome: "win" | "loss";
};

const ROUNDS: Round[] = [
  { direction: "long", outcome: "win" },
  { direction: "short", outcome: "loss" },
];

type Phase =
  | "history"
  | "decide"
  | "entered"
  | "play"
  | "result"
  | "tally"
  | "reset";

const PHASE_MS: Record<Phase, number> = {
  history: 1800,
  decide: 1200,
  entered: 700,
  play: 2200,
  result: 1500,
  tally: 1100,
  reset: 600,
};

const HISTORY_COUNT = 14; // candles drawn before the user picks
const FUTURE_COUNT = 10; // candles drawn after the entry

// Deterministic seed-based randomness so the candles always look right but
// each round has a different shape.
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Candle = { o: number; h: number; l: number; c: number };

function generateRound(round: Round, seed: number): Candle[] {
  const rand = mulberry32(seed);
  const candles: Candle[] = [];
  let price = 100;
  // History: random drift with slight downbias for long-win setup and upbias
  // for short-loss (so the chart looks like a real reversal/continuation).
  const historyBias =
    round.direction === "long" ? -0.18 : 0.16;
  for (let i = 0; i < HISTORY_COUNT; i++) {
    const drift = (rand() - 0.5 + historyBias) * 1.6;
    const o = price;
    const c = o + drift;
    const h = Math.max(o, c) + rand() * 0.7;
    const l = Math.min(o, c) - rand() * 0.7;
    candles.push({ o, h, l, c });
    price = c;
  }
  // Future: directed move based on direction × outcome
  const goingUp =
    (round.direction === "long" && round.outcome === "win") ||
    (round.direction === "short" && round.outcome === "loss");
  const futureBias = goingUp ? 0.55 : -0.55;
  for (let i = 0; i < FUTURE_COUNT; i++) {
    const drift = (rand() - 0.5) * 1.2 + futureBias;
    const o = price;
    const c = o + drift;
    const h = Math.max(o, c) + rand() * 0.7;
    const l = Math.min(o, c) - rand() * 0.7;
    candles.push({ o, h, l, c });
    price = c;
  }
  return candles;
}

export function ReplayMockup() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("history");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const round = ROUNDS[roundIdx];

  // Persist seeds across resets so reruns of the same round look identical.
  const seed = useMemo(() => 1337 + roundIdx * 71, [roundIdx]);
  const candles = useMemo(() => generateRound(round, seed), [round, seed]);

  // State machine, each phase has a fixed duration; transitions roll the
  // round counter forward and bump win/loss tallies.
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((p) => {
        const order: Phase[] = [
          "history",
          "decide",
          "entered",
          "play",
          "result",
          "tally",
          "reset",
        ];
        const i = order.indexOf(p);
        // Tally bump fires on entering 'tally' phase
        if (order[i + 1] === "tally") {
          if (round.outcome === "win") setWins((w) => w + 1);
          else setLosses((l) => l + 1);
        }
        if (order[i + 1] === "reset" || i === order.length - 1) {
          // Advance to next round AFTER reset finishes
          setTimeout(() => {
            setRoundIdx((r) => (r + 1) % ROUNDS.length);
            setPhase("history");
          }, PHASE_MS.reset);
          return "reset";
        }
        return order[i + 1] as Phase;
      });
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, round.outcome]);

  // Layout constants
  const W = 600;
  const H = 320;
  const PAD_X = 20;
  const PAD_Y = 24;

  const total = candles.length;
  // Find the y-extents across the *entire* round so candles don't jump
  // when the future ones appear.
  const hi = Math.max(...candles.map((c) => c.h));
  const lo = Math.min(...candles.map((c) => c.l));
  const yRange = hi - lo || 1;
  const colW = (W - PAD_X * 2) / total;
  const xOf = (i: number) => PAD_X + i * colW + colW / 2;
  const yOf = (p: number) =>
    PAD_Y + ((hi - p) / yRange) * (H - PAD_Y * 2);

  // Visible-candle count by phase
  const visibleCount = (() => {
    if (phase === "history") return HISTORY_COUNT;
    if (phase === "decide" || phase === "entered") return HISTORY_COUNT;
    if (phase === "play") return total;
    if (phase === "result" || phase === "tally") return total;
    if (phase === "reset") return HISTORY_COUNT;
    return HISTORY_COUNT;
  })();

  const entryCandle = candles[HISTORY_COUNT - 1];
  const entryPrice = entryCandle?.c ?? 100;

  // SL distance, half a bar's average range
  const slDelta = yRange * 0.05;
  const slPrice =
    round.direction === "long" ? entryPrice - slDelta : entryPrice + slDelta;

  const finalPrice = candles[total - 1]?.c ?? entryPrice;
  const showSL = phase === "entered" || phase === "play" || phase === "result";
  const showCursor = phase === "decide";
  const showEntry = phase !== "history" && phase !== "reset";
  const showResult = phase === "result" || phase === "tally";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl ring-1 ring-white/5">
      {/* App-chrome top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-zinc-900/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500/60" />
            <span className="h-2 w-2 rounded-full bg-amber-500/60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          </div>
          <div className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Daily Drill · Replay / Predict
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          <span className="font-mono">
            <span className="text-emerald-300">{wins}W</span>
            <span className="mx-1 text-zinc-600">·</span>
            <span className="text-rose-300">{losses}L</span>
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            streak {wins}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_Y + f * (H - PAD_Y * 2)}
              y2={PAD_Y + f * (H - PAD_Y * 2)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          ))}

          {/* Divider between history and future */}
          <line
            x1={xOf(HISTORY_COUNT - 0.5)}
            x2={xOf(HISTORY_COUNT - 0.5)}
            y1={PAD_Y}
            y2={H - PAD_Y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* Candles */}
          {candles.slice(0, visibleCount).map((c, i) => {
            const isFuture = i >= HISTORY_COUNT;
            const bullish = c.c >= c.o;
            const color = bullish ? "#34d399" : "#fb7185";
            const x = xOf(i);
            const yO = yOf(c.o);
            const yC = yOf(c.c);
            const yH = yOf(c.h);
            const yL = yOf(c.l);
            const bodyTop = Math.min(yO, yC);
            const bodyH = Math.max(2, Math.abs(yC - yO));
            return (
              <g
                key={i}
                style={{
                  opacity: isFuture ? 0.95 : 1,
                  transition: "opacity 220ms ease",
                }}
              >
                <line
                  x1={x}
                  x2={x}
                  y1={yH}
                  y2={yL}
                  stroke={color}
                  strokeWidth={1.2}
                />
                <rect
                  x={x - colW * 0.35}
                  width={colW * 0.7}
                  y={bodyTop}
                  height={bodyH}
                  fill={color}
                  rx={1}
                />
              </g>
            );
          })}

          {/* Entry line */}
          {showEntry && (
            <line
              x1={xOf(HISTORY_COUNT - 0.5)}
              x2={W - PAD_X}
              y1={yOf(entryPrice)}
              y2={yOf(entryPrice)}
              stroke="#67e8f9"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          )}

          {/* SL line */}
          {showSL && (
            <line
              x1={xOf(HISTORY_COUNT - 0.5)}
              x2={W - PAD_X}
              y1={yOf(slPrice)}
              y2={yOf(slPrice)}
              stroke="#f43f5e"
              strokeWidth={1.4}
              strokeDasharray="6 3"
            />
          )}

          {/* Entry label */}
          {showEntry && (
            <g>
              <rect
                x={xOf(HISTORY_COUNT - 0.5) + 4}
                y={yOf(entryPrice) - 8}
                rx={3}
                width={42}
                height={14}
                fill="#0f766e"
                opacity={0.95}
              />
              <text
                x={xOf(HISTORY_COUNT - 0.5) + 25}
                y={yOf(entryPrice) + 2}
                textAnchor="middle"
                fontSize={9}
                fill="#fff"
                fontWeight={700}
                fontFamily="monospace"
              >
                ENTRY
              </text>
            </g>
          )}

          {/* SL label */}
          {showSL && (
            <g>
              <rect
                x={xOf(HISTORY_COUNT - 0.5) + 4}
                y={yOf(slPrice) - 7}
                rx={3}
                width={28}
                height={14}
                fill="#9f1239"
              />
              <text
                x={xOf(HISTORY_COUNT - 0.5) + 18}
                y={yOf(slPrice) + 3}
                textAnchor="middle"
                fontSize={9}
                fill="#fff"
                fontWeight={700}
                fontFamily="monospace"
              >
                SL
              </text>
            </g>
          )}
        </svg>

        {/* Floating BUY / SELL buttons */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          <button
            disabled
            className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
              phase === "entered" && round.direction === "long"
                ? "scale-105 bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
            } ${
              phase === "decide" && round.direction === "long"
                ? "ring-2 ring-emerald-300"
                : ""
            }`}
          >
            <ArrowUp className="h-3 w-3" strokeWidth={3} />
            buy
          </button>
          <button
            disabled
            className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
              phase === "entered" && round.direction === "short"
                ? "scale-105 bg-rose-500 text-white shadow-lg shadow-rose-500/40"
                : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30"
            } ${
              phase === "decide" && round.direction === "short"
                ? "ring-2 ring-rose-300"
                : ""
            }`}
          >
            <ArrowDown className="h-3 w-3" strokeWidth={3} />
            sell
          </button>
        </div>

        {/* Cursor */}
        {showCursor && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: round.direction === "long" ? "44%" : "52%",
              bottom: "12px",
              animation: "ray-cursor-press 1.2s ease-out forwards",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M3 2 L17 10 L11 11 L9 17 Z" />
            </svg>
          </div>
        )}

        {/* Result badge */}
        {showResult && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ animation: "ray-result-pop 0.4s ease-out" }}
          >
            <div
              className={`rounded-2xl px-5 py-2 text-2xl font-black uppercase tracking-wider ring-2 backdrop-blur ${
                round.outcome === "win"
                  ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/50"
                  : "bg-rose-500/20 text-rose-200 ring-rose-400/50"
              }`}
            >
              {round.outcome === "win" ? "+1R · WIN" : "−1R · LOSS"}
            </div>
          </div>
        )}

        {/* Reset shimmer */}
        {phase === "reset" && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 text-[11px] text-zinc-400 backdrop-blur-sm">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            next round…
          </div>
        )}
      </div>

      {/* Bottom helper */}
      <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-zinc-900/60 px-4 py-2 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Target className="h-3 w-3 text-zinc-400" strokeWidth={2} />
          {phase === "history" || phase === "decide"
            ? "watch the structure, then call your direction."
            : phase === "entered"
            ? `you ${round.direction === "long" ? "bought" : "sold"}, SL set.`
            : phase === "play"
            ? "playing it forward…"
            : phase === "result"
            ? round.outcome === "win"
              ? "TP tagged. another rep banked."
              : "stopped. next chart."
            : "resetting…"}
        </span>
        <span className="font-mono">
          {round.direction === "long" ? "LONG" : "SHORT"}
        </span>
      </div>

      <style>{`
        @keyframes ray-cursor-press {
          0% { transform: translate(0,0) scale(1); opacity: 0; }
          30% { transform: translate(0,0) scale(1); opacity: 1; }
          70% { transform: translate(-2px,2px) scale(0.85); opacity: 1; }
          100% { transform: translate(-2px,2px) scale(0.85); opacity: 1; }
        }
        @keyframes ray-result-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
