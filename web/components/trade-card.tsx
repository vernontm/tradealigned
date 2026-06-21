"use client";

import { EyeOff, Gem, LogIn, LogOut, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toMediaUrl } from "@/lib/media";
import { useIsAdmin } from "@/lib/use-current-user";

/**
 * Outcome values that count as a final, real result a student would care
 * about. Anything else (unknown, needs_manual_review, spoken_chart_mismatch,
 * not_my_instrument) is curation state, hidden from the outcome chip for
 * non-admins so students never see "needs review" or "unknown" badges.
 */
const STUDENT_VISIBLE_OUTCOMES = new Set(["win", "loss", "breakeven"]);

type VideoMeta = { video_date: string | null };

type TradeData = {
  id: string;
  instrument: string | null;
  direction: string | null;
  final_outcome: string;
  manual_outcome?: string | null;
  hidden?: boolean;
  setup_type: string | null;
  estimated_rr: string | null;
  reasoning: string | null;
  entry_frame_path: string | null;
  exit_frame_path: string | null;
  trade_clip_path: string | null;
  entry_chart_time: string | null;
  exit_chart_time: string | null;
  videos?: VideoMeta | VideoMeta[] | null;
};

const outcomeStyle: Record<string, string> = {
  win: "bg-emerald-500/15 text-emerald-300 ring-emerald-200",
  loss: "bg-rose-500/15 text-rose-300 ring-rose-200",
  breakeven: "bg-amber-500/15 text-amber-300 ring-amber-200",
  open_runner: "bg-sky-500/15 text-sky-300 ring-sky-200",
  spoken_chart_mismatch: "bg-orange-50 text-orange-700 ring-orange-200",
  not_my_instrument: "bg-white/10 text-zinc-400 ring-white/10",
  needs_manual_review: "bg-violet-500/15 text-violet-300 ring-violet-200",
  unknown: "bg-white/10 text-zinc-400 ring-white/10",
};

const OUTCOME_CHOICES: { value: string; label: string }[] = [
  { value: "win", label: "win" },
  { value: "loss", label: "loss" },
  { value: "breakeven", label: "BE" },
  { value: "needs_manual_review", label: "review" },
  { value: "not_my_instrument", label: "off-inst" },
];

export function TradeCard({
  trade,
  onChange,
}: {
  trade: TradeData;
  onChange?: (next: { manual_outcome?: string | null; hidden?: boolean }) => void;
}) {
  const entry = toMediaUrl(trade.entry_frame_path);
  const exit = toMediaUrl(trade.exit_frame_path);
  const clip = toMediaUrl(trade.trade_clip_path);
  const initialMode: "entry" | "exit" | "clip" = entry
    ? "entry"
    : exit
    ? "exit"
    : "clip";
  const [mode, setMode] = useState<"entry" | "exit" | "clip">(initialMode);
  const [manualOutcome, setManualOutcome] = useState<string | null>(
    trade.manual_outcome ?? null
  );
  const [hidden, setHidden] = useState<boolean>(!!trade.hidden);
  const [busy, setBusy] = useState(false);

  const date = Array.isArray(trade.videos)
    ? trade.videos[0]?.video_date
    : trade.videos?.video_date;

  const effective = manualOutcome ?? trade.final_outcome;
  const badge = outcomeStyle[effective] ?? outcomeStyle.unknown;
  const hasMedia = entry || exit || clip;
  const isOverridden = manualOutcome !== null;
  const isAdmin = useIsAdmin();
  const showOutcomeChip = isAdmin || STUDENT_VISIBLE_OUTCOMES.has(effective);

  async function persist(patch: {
    manual_outcome?: string | null;
    hidden?: boolean;
  }) {
    setBusy(true);
    try {
      await fetch("/api/trade/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trade_id: trade.id, ...patch }),
      });
      onChange?.(patch);
    } finally {
      setBusy(false);
    }
  }

  function pickOutcome(value: string) {
    if (effective === value) return; // already the effective outcome
    setManualOutcome(value);
    void persist({ manual_outcome: value });
  }

  function clearOverride() {
    setManualOutcome(null);
    void persist({ manual_outcome: null });
  }

  function toggleHide() {
    const next = !hidden;
    setHidden(next);
    void persist({ hidden: next });
  }

  async function pinAsGem() {
    const quote = prompt(
      "what's the lesson? (edit Ray's reasoning or write your own, title auto-generates)",
      trade.reasoning ?? ""
    );
    if (!quote || !quote.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/gems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quote: quote.trim(),
          concept: "trade lesson",
          frame_path: trade.entry_frame_path,
          pinned_from_trade_id: trade.id,
        }),
      });
    } finally {
      setBusy(false);
    }
  }

  if (hidden) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-50/60 p-3 text-xs text-zinc-500">
        <div className="flex items-center justify-between gap-2">
          <span>
            <EyeOff className="mr-1 inline-block h-3 w-3" strokeWidth={2} />
            hidden, {date ?? "?"} · {trade.direction ?? "?"} {trade.instrument ?? "?"}
          </span>
          <button
            type="button"
            onClick={toggleHide}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2} />
            unhide
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-100">{date ?? "no date"}</span>
          <span className="text-zinc-300">·</span>
          <span className="text-zinc-300">
            {trade.direction ?? "?"} {trade.instrument ?? "?"}
          </span>
        </div>
        {showOutcomeChip && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badge}`}
          >
            {isAdmin && isOverridden && (
              <span className="mr-1 text-[8px] opacity-70">(edit)</span>
            )}
            {effective.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {(trade.setup_type || trade.estimated_rr) && (
        <div className="mt-1.5 text-xs text-zinc-500">
          {trade.setup_type ?? ""}
          {trade.estimated_rr ? ` · RR ${trade.estimated_rr}` : ""}
        </div>
      )}

      {hasMedia && (
        <>
          <div className="mt-3 inline-flex rounded-xl bg-white/10 p-0.5 text-xs">
            <ToggleBtn
              active={mode === "entry"}
              disabled={!entry}
              onClick={() => setMode("entry")}
              icon={<LogIn className="h-3 w-3" strokeWidth={2} />}
              label="entry"
            />
            <ToggleBtn
              active={mode === "exit"}
              disabled={!exit}
              onClick={() => setMode("exit")}
              icon={<LogOut className="h-3 w-3" strokeWidth={2} />}
              label="exit"
            />
            <ToggleBtn
              active={mode === "clip"}
              disabled={!clip}
              onClick={() => setMode("clip")}
              icon={<Play className="h-3 w-3" strokeWidth={2} />}
              label="40s clip"
            />
          </div>

          <div className="mt-2 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
            {mode === "entry" && entry && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry} alt="entry" className="w-full" loading="lazy" />
            )}
            {mode === "exit" && exit && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exit} alt="exit" className="w-full" loading="lazy" />
            )}
            {mode === "clip" && clip && (
              <video
                src={clip}
                controls
                autoPlay
                className="w-full"
                preload="metadata"
              />
            )}
          </div>
        </>
      )}

      {trade.reasoning && (
        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
          {trade.reasoning.length > 360
            ? trade.reasoning.slice(0, 360) + "…"
            : trade.reasoning}
        </p>
      )}

      {/* curation strip, admin only */}
      {isAdmin && (
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-white/10 pt-3">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">
          fix outcome:
        </span>
        {OUTCOME_CHOICES.map((c) => {
          const active = effective === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => pickOutcome(c.value)}
              disabled={busy}
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-50 ${
                active
                  ? c.value === "win"
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                    : c.value === "loss"
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-800"
                    : "border-zinc-700 bg-white/10 text-zinc-300"
                  : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          );
        })}
        {isOverridden && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={busy}
            className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-white/10"
            title="revert to auto-detected outcome"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2} />
            revert
          </button>
        )}
        <button
          type="button"
          onClick={pinAsGem}
          disabled={busy}
          title="pin this trade's reasoning as a gem"
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-500/15"
        >
          <Gem className="h-3 w-3" strokeWidth={2} />
          pin as gem
        </button>
        <button
          type="button"
          onClick={toggleHide}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-400"
        >
          <EyeOff className="h-3 w-3" strokeWidth={2} />
          hide
        </button>
      </div>
      )}
    </div>
  );
}

function ToggleBtn({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-zinc-900/60 text-zinc-100 shadow-sm"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
