"use client";

import { LessonCard, type LessonSpec } from "./lesson-card";
import { PatternCard, type PatternSpec } from "./pattern-card";
import { TradeCard } from "./trade-card";

export type PreviewCard =
  | { kind: "trade"; trade: Parameters<typeof TradeCard>[0]["trade"] }
  | { kind: "pattern"; spec: PatternSpec }
  | { kind: "lesson"; lesson: LessonSpec };

export function PreviewPane({ cards }: { cards: PreviewCard[] }) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-white/10 bg-black/30">
      <div className="shrink-0 border-b border-white/10 bg-zinc-900/60 px-6 py-3.5 backdrop-blur">
        <div className="text-sm font-semibold text-zinc-100">preview</div>
        <div className="text-[11px] text-zinc-500">
          {cards.length === 0
            ? "trades Ray references will appear here"
            : `${cards.length} item${cards.length === 1 ? "" : "s"}`}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {cards.length === 0 && (
          <div className="pt-16 text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/60 shadow-sm ring-1 ring-white/10">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-200 to-teal-200" />
            </div>
            <div className="mt-3 text-xs text-zinc-400">
              ask Ray something and his trades will show up here
            </div>
          </div>
        )}
        {cards.map((c, i) =>
          c.kind === "trade" ? (
            <TradeCard key={i} trade={c.trade} />
          ) : c.kind === "pattern" ? (
            <PatternCard key={i} spec={c.spec} />
          ) : c.kind === "lesson" ? (
            <LessonCard key={i} lesson={c.lesson} />
          ) : null
        )}
      </div>
    </div>
  );
}
