"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RotateCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CandleChart } from "./candle-chart";
import { generateEurUsdSeries, type Candle } from "@/lib/candle-gen";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { recordAttempt } from "@/lib/progress";
import { chargeForAction } from "@/lib/use-credit-balance";

const SESSION_COST = CREDIT_COSTS.drill_sniper;

const TARGET_PIPS = 10;
const PIP = 0.0001;
const TOTAL_CANDLES = 360;
const INITIAL_VISIBLE = 64;
const PLAY_INTERVAL_MS = 380;
const DEFAULT_SL_PIPS = 5;

type Position = {
  side: "long" | "short";
  entry: number;
  sl: number;
  tp: number;
  openedAtIdx: number;
};

type Result = {
  outcome: "win" | "loss" | "timeout";
  resolvedAtIdx: number;
  pnlPips: number;
};

type Stats = { wins: number; losses: number; timeouts: number };

const fmt = (n: number) => n.toFixed(5);
const pipsBetween = (a: number, b: number) => (b - a) / PIP;

export function SniperView() {
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<Stats>({ wins: 0, losses: 0, timeouts: 0 });
  const [series, setSeries] = useState<{ candles: Candle[] } | null>(null);
  const [visibleIdx, setVisibleIdx] = useState(INITIAL_VISIBLE); // exclusive upper bound
  const [position, setPosition] = useState<Position | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  // Pending state, user has picked a direction but not yet committed (next/play locks in).
  // Lets them swap direction freely and drag the SL line before pulling the trigger.
  const [pendingSide, setPendingSide] = useState<"long" | "short" | null>(null);
  const [pendingSlPrice, setPendingSlPrice] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(false);

  // Free per-round — the session was already paid for when the player hit
  // start (see startSession below).
  const startRound = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setSeries(generateEurUsdSeries());
      setVisibleIdx(INITIAL_VISIBLE);
      setPosition(null);
      setResult(null);
      setPendingSide(null);
      setPendingSlPrice(null);
      setPlaying(false);
      setLoading(false);
    }, 60);
  }, []);

  // Charge ONCE at session start.
  const startSession = useCallback(async () => {
    const outcome = await chargeForAction("drill_sniper");
    if (!outcome.ok) {
      if (outcome.reason === "insufficient") {
        alert(
          "out of credits — start your 7-day free trial from the pricing page to keep going."
        );
      }
      return;
    }
    setStarted(true);
  }, []);

  useEffect(() => {
    if (started && !series) startRound();
  }, [started, series, startRound]);

  const currentCandle = useMemo(
    () => (series ? series.candles[visibleIdx - 1] : null),
    [series, visibleIdx]
  );

  // Advance one candle, checking for SL/TP hit if a position is open.
  // If a pending side+SL is set, commit it FIRST so the very next candle is live.
  const advance = useCallback(() => {
    if (!series) return;
    if (visibleIdx >= series.candles.length) {
      setPlaying(false);
      if (position && !result) {
        setResult({ outcome: "timeout", resolvedAtIdx: visibleIdx - 1, pnlPips: 0 });
        recordAttempt("sniper", "timeout");
        setStats((s) => ({ ...s, timeouts: s.timeouts + 1 }));
      }
      return;
    }

    // Lock in pending direction + SL on first step
    let activePosition: Position | null = position;
    if (!activePosition && pendingSide && pendingSlPrice !== null && currentCandle) {
      const entry = currentCandle.c;
      const tp = pendingSide === "long" ? entry + TARGET_PIPS * PIP : entry - TARGET_PIPS * PIP;
      activePosition = {
        side: pendingSide,
        entry,
        sl: pendingSlPrice,
        tp,
        openedAtIdx: visibleIdx - 1,
      };
      setPosition(activePosition);
      setPendingSide(null);
      setPendingSlPrice(null);
    }

    const nextIdx = visibleIdx + 1;
    setVisibleIdx(nextIdx);

    if (activePosition && !result) {
      const c = series.candles[nextIdx - 1];
      const position = activePosition; // alias to keep the existing block readable
      // Resolution: for a long, if low <= SL it's a loss (touched first historically
      // when both are inside the bar; we use a simple rule favoring SL to be honest).
      if (position.side === "long") {
        if (c.l <= position.sl) {
          setResult({
            outcome: "loss",
            resolvedAtIdx: nextIdx - 1,
            pnlPips: -Math.abs(pipsBetween(position.sl, position.entry)),
          });
          recordAttempt("sniper", "loss");
          setStats((s) => ({ ...s, losses: s.losses + 1 }));
          setPlaying(false);
          return;
        }
        if (c.h >= position.tp) {
          setResult({
            outcome: "win",
            resolvedAtIdx: nextIdx - 1,
            pnlPips: TARGET_PIPS,
          });
          recordAttempt("sniper", "win");
          setStats((s) => ({ ...s, wins: s.wins + 1 }));
          setPlaying(false);
          return;
        }
      } else {
        if (c.h >= position.sl) {
          setResult({
            outcome: "loss",
            resolvedAtIdx: nextIdx - 1,
            pnlPips: -Math.abs(pipsBetween(position.entry, position.sl)),
          });
          recordAttempt("sniper", "loss");
          setStats((s) => ({ ...s, losses: s.losses + 1 }));
          setPlaying(false);
          return;
        }
        if (c.l <= position.tp) {
          setResult({
            outcome: "win",
            resolvedAtIdx: nextIdx - 1,
            pnlPips: TARGET_PIPS,
          });
          recordAttempt("sniper", "win");
          setStats((s) => ({ ...s, wins: s.wins + 1 }));
          setPlaying(false);
          return;
        }
      }
    }
  }, [series, visibleIdx, position, result, pendingSide, pendingSlPrice, currentCandle]);

  // Play-mode interval
  useEffect(() => {
    if (!playing) return;
    if (playRef.current) clearInterval(playRef.current);
    playRef.current = setInterval(advance, PLAY_INTERVAL_MS);
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, advance]);

  // Pick (or swap) direction. SL defaults to DEFAULT_SL_PIPS away from current price
  // on the correct side. If the user had a pending SL distance, preserve it across swap.
  const pickSide = (side: "long" | "short") => {
    if (!currentCandle) return;
    const entry = currentCandle.c;
    const distance =
      pendingSlPrice !== null && pendingSide
        ? Math.abs(currentCandle.c - pendingSlPrice)
        : DEFAULT_SL_PIPS * PIP;
    const sl = side === "long" ? entry - distance : entry + distance;
    setPendingSide(side);
    setPendingSlPrice(sl);
  };

  // Drag handler, clamp to correct side of current price + minimum 1 pip away.
  const onSlDrag = (newPrice: number) => {
    if (!pendingSide || !currentCandle) return;
    const entry = currentCandle.c;
    let clamped = newPrice;
    if (pendingSide === "long") {
      clamped = Math.min(entry - PIP, newPrice);
    } else {
      clamped = Math.max(entry + PIP, newPrice);
    }
    setPendingSlPrice(clamped);
  };


  const positionLines = useMemo(() => {
    // Position is locked in, show real entry / SL / TP
    if (position) {
      return [
        { price: position.tp, label: "TP", tone: "tp" as const },
        { price: position.entry, label: "entry", tone: "entry" as const },
        { price: position.sl, label: "SL", tone: "sl" as const },
      ];
    }
    if (!currentCandle) return [];
    const entryPrice = currentCandle.c;

    // Direction chosen but not yet committed, show price + draggable SL only.
    if (pendingSide && pendingSlPrice !== null) {
      return [
        { price: entryPrice, label: "price", tone: "entry" as const },
        {
          price: pendingSlPrice,
          label: pendingSide === "long" ? "SL ▼" : "SL ▲",
          tone: "sl" as const,
          draggable: true,
        },
      ];
    }
    // No direction yet, just the current price marker.
    return [{ price: entryPrice, label: "price", tone: "entry" as const }];
  }, [position, currentCandle, pendingSide, pendingSlPrice]);

  if (!started) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md space-y-5 text-center">
          <div className="inline-flex rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
            Sniper Mode
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">
            target +10 pips. don&apos;t get stopped out.
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            live EURUSD-style candle replay. step through bar by bar, or hit
            play. pick a stop distance, fire <strong>buy</strong> or{" "}
            <strong>sell</strong>, take profit auto-locks at <strong>+10 pips</strong>.
            you win if price hits TP before your stop.
          </p>
          <button
            type="button"
            onClick={startSession}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
          >
            start sniping
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
              {SESSION_COST} credits
            </span>
            →
          </button>
        </div>
      </div>
    );
  }

  if (loading || !series || !currentCandle) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        loading the tape…
      </div>
    );
  }

  const visibleCandles = series.candles.slice(0, visibleIdx);
  const totalDecided = stats.wins + stats.losses + stats.timeouts;
  const winRate = totalDecided === 0 ? 0 : Math.round((stats.wins / totalDecided) * 100);
  const isResolved = !!result;
  const positionPnLPips = position && !result
    ? position.side === "long"
      ? pipsBetween(position.entry, currentCandle.c)
      : pipsBetween(currentCandle.c, position.entry)
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-4 gap-3 border-b border-white/10 px-6 py-3 text-xs">
        <StatTile label="win rate" value={`${winRate}%`} />
        <StatTile label="wins" value={String(stats.wins)} />
        <StatTile label="losses" value={String(stats.losses)} />
        <StatTile label="timeouts" value={String(stats.timeouts)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
              EURUSD · {visibleIdx} / {TOTAL_CANDLES} candles
            </div>
            <div className="font-mono text-xs text-zinc-400">
              price <span className="font-semibold text-zinc-100">{fmt(currentCandle.c)}</span>
              {position && !result && (
                <span
                  className={`ml-2 font-semibold ${
                    positionPnLPips >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {positionPnLPips >= 0 ? "+" : ""}
                  {positionPnLPips.toFixed(1)} pips
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <CandleChart
              candles={visibleCandles}
              visibleCount={visibleCandles.length}
              positionLines={positionLines}
              priceFormat={fmt}
              width={1600}
              height={560}
              rightGutter={140}
              onLineDrag={onSlDrag}
            />
          </div>

          {/* PRE-DIRECTION: just buy/sell buttons. next/play locked. */}
          {!position && !result && !pendingSide && (
            <div className="space-y-3 rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
              <div className="text-[11px] text-zinc-500">
                target locks at <strong className="text-zinc-300">+{TARGET_PIPS} pips</strong> from
                wherever you fire. read the chart first.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => pickSide("long")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  buy
                </button>
                <button
                  type="button"
                  onClick={() => pickSide("short")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90"
                >
                  <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
                  sell
                </button>
              </div>
              <div className="rounded-lg border border-dashed border-white/10 bg-zinc-50/60 px-3 py-2 text-[11px] text-zinc-500">
                next + play unlock once you buy or sell.
              </div>
            </div>
          )}

          {/* PENDING, direction picked, SL is draggable, can still swap */}
          {!position && !result && pendingSide && pendingSlPrice !== null && currentCandle && (
            <div className="space-y-3 rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
                      pendingSide === "long"
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-200"
                        : "bg-rose-500/15 text-rose-300 ring-rose-200"
                    }`}
                  >
                    {pendingSide === "long" ? "buying" : "selling"}
                  </span>
                  <span className="font-mono text-zinc-300">
                    SL {fmt(pendingSlPrice)} · stop{" "}
                    <strong>
                      {Math.abs(pipsBetween(currentCandle.c, pendingSlPrice)).toFixed(1)} pips
                    </strong>{" "}
                    · TP +{TARGET_PIPS} pips
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => pickSide("long")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow transition ${
                    pendingSide === "long"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                      : "bg-white/10 text-zinc-300 hover:bg-emerald-500/15"
                  }`}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  {pendingSide === "long" ? "buy" : "swap to buy"}
                </button>
                <button
                  type="button"
                  onClick={() => pickSide("short")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow transition ${
                    pendingSide === "short"
                      ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white"
                      : "bg-white/10 text-zinc-300 hover:bg-rose-500/15"
                  }`}
                >
                  <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
                  {pendingSide === "short" ? "sell" : "swap to sell"}
                </button>
              </div>
              <div className="rounded-lg border border-dashed border-rose-500/30 bg-rose-50/40 px-3 py-2 text-[11px] text-rose-800">
                drag the <strong>red SL line</strong> up or down on the chart to set your stop size.
                you can still swap direction. hit <strong>next</strong> or <strong>play</strong>{" "}
                when you&apos;re ready, that locks it in.
              </div>
              <ControlsRow
                onNext={advance}
                playing={playing}
                togglePlay={() => setPlaying((p) => !p)}
                disabled={visibleIdx >= series.candles.length}
                label="lock in and play the tape"
              />
            </div>
          )}

          {position && !result && (
            <div className="space-y-3 rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
                      position.side === "long"
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-200"
                        : "bg-rose-500/15 text-rose-300 ring-rose-200"
                    }`}
                  >
                    {position.side}
                  </span>
                  <span className="font-mono text-zinc-300">
                    entry {fmt(position.entry)} · SL {fmt(position.sl)} · TP {fmt(position.tp)}
                  </span>
                </div>
              </div>
              <ControlsRow
                onNext={advance}
                playing={playing}
                togglePlay={() => setPlaying((p) => !p)}
                disabled={visibleIdx >= series.candles.length}
                label="play the tape, let it cook"
              />
            </div>
          )}

          {isResolved && result && (
            <div
              className={`space-y-3 rounded-2xl border px-4 py-4 shadow-sm ${
                result.outcome === "win"
                  ? "border-emerald-500/30 bg-emerald-500/15"
                  : result.outcome === "loss"
                  ? "border-rose-500/30 bg-rose-50/40"
                  : "border-white/10 bg-zinc-50/60"
              }`}
            >
              <div className="text-base font-bold">
                {result.outcome === "win"
                  ? `+${TARGET_PIPS} pips, that's the read 🎯`
                  : result.outcome === "loss"
                  ? `stopped out (${result.pnlPips.toFixed(0)} pips)`
                  : "session ran out, no resolution"}
              </div>
              <div className="text-xs text-zinc-400">
                {result.outcome === "win"
                  ? "you called the direction and your stop survived the noise. that's the whole game."
                  : result.outcome === "loss"
                  ? "tighter stops = better R, but more chop hits. wider stops = more breathing room but bigger losses. find the balance."
                  : "the market was choppy. sometimes there's no edge, sit and wait."}
              </div>
              <button
                type="button"
                onClick={startRound}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90"
              >
                <RotateCw className="h-4 w-4" />
                new round
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlsRow({
  onNext,
  playing,
  togglePlay,
  disabled,
  label,
}: {
  onNext: () => void;
  playing: boolean;
  togglePlay: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNext}
          disabled={disabled || playing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow transition disabled:cursor-not-allowed disabled:opacity-40 ${
            playing
              ? "bg-zinc-800 text-white hover:opacity-90"
              : "bg-gradient-to-br from-rose-500 to-pink-600 text-white hover:opacity-90"
          }`}
        >
          {playing ? (
            <>
              <Pause className="h-3.5 w-3.5" /> pause
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> play
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
