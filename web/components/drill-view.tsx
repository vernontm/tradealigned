"use client";

import { CheckCircle2, Loader2, RotateCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { recordAttempt } from "@/lib/progress";
import { broadcastBalance } from "@/lib/use-credit-balance";

type Question = {
  id: string;
  kind: "would_you_take" | "identify_setup";
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

const choiceLabel = (_kind: Question["kind"], choice: string) => choice;

export function DrillView() {
  const [q, setQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ correct: 0, total: 0, streak: 0 });
  const [started, setStarted] = useState(false);

  const nextQuestion = useCallback(async () => {
    setSelected(null);
    setLoading(true);
    try {
      const r = await fetch("/api/drill/question");
      if (r.status === 402) {
        const j = await r.json();
        if (typeof j.balance === "number") broadcastBalance(j.balance);
        alert(
          "out of credits — start your 7-day free trial from the pricing page to keep going."
        );
        return;
      }
      if (!r.ok) throw new Error("no question");
      const j = (await r.json()) as Question & { credits_balance?: number };
      if (typeof j.credits_balance === "number") {
        broadcastBalance(j.credits_balance);
      }
      setQ(j);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (started && !q) nextQuestion();
  }, [started, q, nextQuestion]);

  const start = () => {
    setStats({ correct: 0, total: 0, streak: 0 });
    setStarted(true);
  };

  const pick = (i: number) => {
    if (selected !== null || !q) return;
    setSelected(i);
    const isCorrect = i === q.correct_index;
    recordAttempt("quiz", isCorrect ? "correct" : "incorrect");
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
          <div className="inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
            Daily Drill
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">
            train your eye on Ray&apos;s real setups
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            you&apos;ll see real entry screenshots from Ray&apos;s trades. predict the
            outcome, identify the setup. instant feedback with Ray&apos;s actual
            reasoning. no streak resets, no timers, learn at your pace.
          </p>
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
          >
            start a session →
          </button>
        </div>
      </div>
    );
  }

  if (loading || !q) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        loading next question…
      </div>
    );
  }

  const answered = selected !== null;
  const isCorrect = answered && selected === q.correct_index;
  const accuracyPct =
    stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* stats strip */}
      <div className="grid shrink-0 grid-cols-3 gap-3 border-b border-white/10 px-6 py-3 text-xs">
        <StatTile label="accuracy" value={`${accuracyPct}%`} />
        <StatTile label="streak" value={`${stats.streak} 🔥`} />
        <StatTile label="answered" value={`${stats.correct}/${stats.total}`} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              {q.kind === "would_you_take" ? "would you take it?" : "identify setup"}
            </div>
            {q.meta.video_date && (
              <div className="text-[10px] text-zinc-400">
                {q.meta.video_date}
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold text-zinc-100">{q.prompt}</h3>

          {q.image_url && (
            <div className="overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.image_url} alt="entry chart" className="w-full" />
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, i) => {
              const isPicked = selected === i;
              const isCorrectAnswer = i === q.correct_index;
              const state = !answered
                ? "default"
                : isCorrectAnswer
                ? "correct"
                : isPicked
                ? "wrong"
                : "dim";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={answered}
                  className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                    state === "default"
                      ? "border-white/10 bg-zinc-900/60 text-zinc-200 hover:border-emerald-400/60 hover:bg-emerald-500/15"
                      : state === "correct"
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                      : state === "wrong"
                      ? "border-rose-400 bg-rose-500/15 text-rose-200"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  } ${answered ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span>{choiceLabel(q.kind, c)}</span>
                  {state === "correct" && (
                    <CheckCircle2
                      className="h-5 w-5 text-emerald-600"
                      strokeWidth={2}
                    />
                  )}
                  {state === "wrong" && (
                    <XCircle
                      className="h-5 w-5 text-rose-600"
                      strokeWidth={2}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isCorrect ? (
                  <span className="text-emerald-300">nice, that&apos;s right</span>
                ) : (
                  <span className="text-rose-300">not this one bro</span>
                )}
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-400">
                  Ray&apos;s answer:{" "}
                  <strong>
                    {choiceLabel(q.kind, q.choices[q.correct_index])}
                  </strong>
                </span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Ray says
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {q.explanation}
              </div>
              {q.meta.estimated_rr && (
                <div className="text-xs text-zinc-500">
                  R:R achieved: {q.meta.estimated_rr}
                </div>
              )}
              <button
                type="button"
                onClick={nextQuestion}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90"
              >
                <RotateCw className="h-4 w-4" />
                next question
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
