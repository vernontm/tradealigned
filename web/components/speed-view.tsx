"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { recordAttempt } from "@/lib/progress";
import { chargeForAction } from "@/lib/use-credit-balance";

const SESSION_COST = CREDIT_COSTS.drill_speed;

type Question = {
  id: string;
  kind: "identify_setup";
  trade_id: string;
  prompt: string;
  image_url: string | null;
  choices: string[];
  correct_index: number;
  explanation: string;
  meta: {
    direction: string | null;
    instrument: string | null;
    setup_type: string | null;
    estimated_rr: string | null;
    video_date: string | null;
  };
};

type Stats = { correct: number; total: number; streak: number };

const FLASH_SECONDS = 5;

export function SpeedView() {
  const [q, setQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ correct: 0, total: 0, streak: 0 });
  const [started, setStarted] = useState(false);
  const [showingChart, setShowingChart] = useState(false);
  const [countdown, setCountdown] = useState(FLASH_SECONDS);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Free per-round — the session was paid for at start().
  const next = useCallback(async () => {
    setSelected(null);
    setShowingChart(false);
    setLoading(true);
    setCountdown(FLASH_SECONDS);
    try {
      // Force an identify_setup question, keep asking until we get one
      for (let i = 0; i < 6; i++) {
        const r = await fetch("/api/drill/question");
        if (!r.ok) continue;
        const candidate = (await r.json()) as Question;
        if (candidate.kind === "identify_setup") {
          setQ(candidate);
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (started && !q) next();
  }, [started, q, next]);

  // start countdown when we have a question and haven't started the flash yet
  useEffect(() => {
    if (!q || selected !== null) return;
    if (!showingChart) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setShowingChart(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [q, selected, showingChart]);

  // Charge ONCE at session start.
  const start = async () => {
    const outcome = await chargeForAction("drill_speed");
    if (!outcome.ok) {
      if (outcome.reason === "insufficient") {
        alert(
          "out of credits — start your 7-day free trial from the pricing page to keep going."
        );
      }
      return;
    }
    setStats({ correct: 0, total: 0, streak: 0 });
    setStarted(true);
  };

  const peek = () => {
    if (selected !== null) return;
    setCountdown(FLASH_SECONDS);
    setShowingChart(true);
  };

  const pick = (i: number) => {
    if (selected !== null || !q) return;
    setSelected(i);
    const isCorrect = i === q.correct_index;
    recordAttempt("speed", isCorrect ? "correct" : "incorrect");
    setStats((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
      streak: isCorrect ? s.streak + 1 : 0,
    }));
  };

  if (!started) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md space-y-5 text-center">
          <div className="inline-flex rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
            Speed Read
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">
            5 seconds. read fast.
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            tap to flash the chart for 5 seconds. then it hides. you pick the
            setup from memory. trains the instinctive read you need for live
            trading.
          </p>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
          >
            start speed reading
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
              {SESSION_COST} credits
            </span>
            →
          </button>
        </div>
      </div>
    );
  }

  if (loading || !q) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        loading next chart…
      </div>
    );
  }

  const accuracyPct =
    stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
  const revealed = selected !== null;
  const isCorrect = revealed && selected === q.correct_index;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-3 gap-3 border-b border-white/10 px-6 py-3 text-xs">
        <StatTile label="accuracy" value={`${accuracyPct}%`} />
        <StatTile label="streak" value={`${stats.streak} 🔥`} />
        <StatTile label="answered" value={`${stats.correct}/${stats.total}`} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              speed read · {FLASH_SECONDS}-second flash
            </div>
            {q.meta.video_date && (
              <div className="text-[10px] text-zinc-400">{q.meta.video_date}</div>
            )}
          </div>

          <h3 className="text-lg font-semibold text-zinc-100">
            {q.prompt}
          </h3>

          <div className="relative overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
            {showingChart && q.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.image_url} alt="chart" className="block w-full" />
                <div className="absolute right-3 top-3 rounded-md bg-violet-600 px-2 py-1 text-xs font-bold text-white shadow">
                  {countdown}s
                </div>
              </>
            ) : revealed && q.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.image_url} alt="chart" className="block w-full" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-center text-zinc-400">
                <div>
                  <EyeOff className="mx-auto h-8 w-8 opacity-50" strokeWidth={1.5} />
                  <div className="mt-2 text-xs">
                    {countdown === 0 ? "chart hidden, pick from memory" : "tap below to flash the chart"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!showingChart && !revealed && (
            <button
              type="button"
              onClick={peek}
              disabled={countdown === 0 && stats.total !== stats.correct + (stats.total - stats.correct)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eye className="h-4 w-4" />
              {countdown === 0 ? "flashed, now pick" : `flash chart (${FLASH_SECONDS}s)`}
            </button>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, i) => {
              const isPicked = selected === i;
              const isCorrectAnswer = i === q.correct_index;
              const state = !revealed
                ? "default"
                : isCorrectAnswer
                ? "correct"
                : isPicked
                ? "wrong"
                : "dim";
              const canPick = !revealed && countdown === 0;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={revealed || showingChart}
                  className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                    state === "default"
                      ? canPick
                        ? "border-white/10 bg-zinc-900/60 text-zinc-200 hover:border-violet-400/60 hover:bg-violet-500/15"
                        : "border-zinc-100 bg-white/5 text-zinc-400"
                      : state === "correct"
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                      : state === "wrong"
                      ? "border-rose-400 bg-rose-500/15 text-rose-200"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  } ${revealed || showingChart ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span>{c}</span>
                  {state === "correct" && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                  )}
                  {state === "wrong" && (
                    <XCircle className="h-5 w-5 text-rose-600" strokeWidth={2} />
                  )}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="space-y-2 rounded-2xl border border-violet-200/70 bg-violet-50/30 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isCorrect ? (
                  <span className="text-emerald-300">eyes locked in</span>
                ) : (
                  <span className="text-rose-300">missed it</span>
                )}
              </div>
              <div className="text-xs text-zinc-400">
                {q.explanation.length > 280
                  ? q.explanation.slice(0, 280) + "…"
                  : q.explanation}
              </div>
              <button
                type="button"
                onClick={next}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90"
              >
                <RotateCw className="h-4 w-4" />
                next flash
              </button>
            </div>
          )}
        </div>
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
