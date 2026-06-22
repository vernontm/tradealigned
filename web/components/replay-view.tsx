"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CandleChart } from "./candle-chart";
import { generateScenario, type Scenario } from "@/lib/candle-gen";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { recordAttempt } from "@/lib/progress";
import { chargeForAction } from "@/lib/use-credit-balance";

const SESSION_COST = CREDIT_COSTS.drill_replay;

type Stats = { correct: number; total: number; streak: number };

export function ReplayView() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<"up" | "down" | null>(null);
  const [stats, setStats] = useState<Stats>({ correct: 0, total: 0, streak: 0 });
  const [started, setStarted] = useState(false);

  // Free per-round — the session was already paid for at start().
  const nextRound = useCallback(() => {
    setSelected(null);
    setLoading(true);
    setTimeout(() => {
      setScenario(generateScenario());
      setLoading(false);
    }, 120);
  }, []);

  useEffect(() => {
    if (started && !scenario) nextRound();
  }, [started, scenario, nextRound]);

  // Charge ONCE at session start.
  const start = async () => {
    const outcome = await chargeForAction("drill_replay");
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

  const pick = (dir: "up" | "down") => {
    if (selected !== null || !scenario) return;
    setSelected(dir);
    const isCorrect = dir === scenario.actualDirection;
    recordAttempt("replay", isCorrect ? "correct" : "incorrect");
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
          <div className="inline-flex rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
            Replay / Predict
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">
            call the next move
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            you see live candlestick price action paused at the current bar.
            read the structure. call <strong>up</strong> or <strong>down</strong>.
            the next 10 candles play out and we score you.
          </p>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
          >
            start replay session
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
              {SESSION_COST} credits
            </span>
            →
          </button>
        </div>
      </div>
    );
  }

  if (loading || !scenario) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        generating new chart…
      </div>
    );
  }

  const accuracyPct =
    stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
  const revealed = selected !== null;
  const isCorrect = revealed && selected === scenario.actualDirection;

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
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              live replay · predict next move
            </div>
            <div className="text-[10px] text-zinc-400">
              {scenario.visibleCount} candles in · {scenario.candles.length - scenario.visibleCount} to play
            </div>
          </div>

          <h3 className="text-lg font-semibold text-zinc-100">
            read this structure. where does price head next?
          </h3>

          <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <CandleChart
              candles={scenario.candles}
              visibleCount={scenario.visibleCount}
              revealAll={revealed}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceButton
              direction="up"
              picked={selected === "up"}
              correct={scenario.actualDirection === "up"}
              revealed={revealed}
              onClick={() => pick("up")}
            />
            <ChoiceButton
              direction="down"
              picked={selected === "down"}
              correct={scenario.actualDirection === "down"}
              revealed={revealed}
              onClick={() => pick("down")}
            />
          </div>

          {revealed && (
            <div className="space-y-3 rounded-2xl border border-sky-200/70 bg-sky-50/40 px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isCorrect ? (
                  <span className="text-emerald-300">good read bro</span>
                ) : (
                  <span className="text-rose-300">missed it</span>
                )}
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-300">
                  price went <strong>{scenario.actualDirection}</strong>{" "}
                  ({((scenario.finalPrice - scenario.startPrice) /
                    scenario.startPrice * 100).toFixed(2)}
                  % from start)
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                {isCorrect
                  ? "that's the read. when structure stacks up bias-side, you trust your eye and you go."
                  : "no shame. study the candles before the cutoff, what was the trend, where were the highs and lows compressing, where did momentum want to break? that's the pattern your eye has to find live."}
              </div>
              <button
                type="button"
                onClick={nextRound}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90"
              >
                <RotateCw className="h-4 w-4" />
                next chart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({
  direction,
  picked,
  correct,
  revealed,
  onClick,
}: {
  direction: "up" | "down";
  picked: boolean;
  correct: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  let state: "default" | "correct" | "wrong" | "dim";
  if (!revealed) state = "default";
  else if (correct) state = "correct";
  else if (picked) state = "wrong";
  else state = "dim";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={revealed}
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-5 text-base font-semibold transition ${
        state === "default"
          ? "border-white/10 bg-zinc-900/60 text-zinc-200 hover:border-sky-400/60 hover:bg-sky-50/40"
          : state === "correct"
          ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
          : state === "wrong"
          ? "border-rose-400 bg-rose-500/15 text-rose-200"
          : "border-white/10 bg-white/5 text-zinc-400"
      } ${revealed ? "cursor-default" : "cursor-pointer"}`}
    >
      {direction === "up" ? (
        <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
      ) : (
        <ArrowDown className="h-5 w-5" strokeWidth={2.5} />
      )}
      price goes {direction}
      {state === "correct" && (
        <CheckCircle2 className="ml-1 h-5 w-5 text-emerald-600" strokeWidth={2} />
      )}
      {state === "wrong" && (
        <XCircle className="ml-1 h-5 w-5 text-rose-600" strokeWidth={2} />
      )}
    </button>
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
