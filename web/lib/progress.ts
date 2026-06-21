"use client";

/**
 * Per-browser drill progress tracker. Persists attempts to localStorage so the
 * Progress page can render aggregate stats without auth. Once Clerk + Supabase
 * sync lands, the same shape syncs server-side.
 */

export type DrillMode = "quiz" | "replay" | "sniper" | "speed";

export type Outcome = "correct" | "incorrect" | "skip" | "win" | "loss" | "timeout";

export type Attempt = {
  mode: DrillMode;
  outcome: Outcome;
  ts: number; // epoch ms
};

const STORAGE_KEY = "ray-ai-progress.v1";
const MAX_RECORDS = 5000; // soft cap to keep localStorage tiny

export const MODE_META: Record<DrillMode, { label: string; accent: string }> = {
  quiz: { label: "Setup Quiz", accent: "from-emerald-500 to-teal-600" },
  replay: { label: "Replay / Predict", accent: "from-sky-500 to-indigo-600" },
  sniper: { label: "Sniper Mode", accent: "from-rose-500 to-pink-600" },
  speed: { label: "Speed Read", accent: "from-violet-500 to-fuchsia-600" },
};

function read(): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Attempt[]) : [];
  } catch {
    return [];
  }
}

function write(records: Attempt[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed =
      records.length > MAX_RECORDS ? records.slice(-MAX_RECORDS) : records;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent("ray-progress-changed"));
  } catch {
    // quota / disabled storage, fail silent
  }
}

/** Append a single attempt. Safe to call from inside React event handlers. */
export function recordAttempt(mode: DrillMode, outcome: Outcome) {
  if (typeof window === "undefined") return;
  const records = read();
  records.push({ mode, outcome, ts: Date.now() });
  write(records);
}

export function getAllAttempts(): Attempt[] {
  return read();
}

export function clearAllAttempts() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("ray-progress-changed"));
}

/** Subscribe to changes. Returns an unsubscribe fn. */
export function onProgressChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-progress-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) cb();
  });
  return () => {
    window.removeEventListener("ray-progress-changed", handler);
  };
}

// ----- aggregations -----

const POSITIVE: Outcome[] = ["correct", "win"];
const NEGATIVE: Outcome[] = ["incorrect", "loss", "timeout"];

export function isPositive(o: Outcome) {
  return POSITIVE.includes(o);
}
export function isNegative(o: Outcome) {
  return NEGATIVE.includes(o);
}

export type ModeStats = {
  mode: DrillMode;
  total: number;
  positive: number;
  negative: number;
  accuracy: number; // 0..100 (positive / (positive+negative))
  bestStreak: number;
  lastTs: number | null;
};

export function statsForMode(
  attempts: Attempt[],
  mode: DrillMode
): ModeStats {
  const mine = attempts.filter((a) => a.mode === mode);
  let positive = 0;
  let negative = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  let lastTs: number | null = null;
  for (const a of mine) {
    if (isPositive(a.outcome)) {
      positive++;
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else if (isNegative(a.outcome)) {
      negative++;
      currentStreak = 0;
    }
    lastTs = a.ts;
  }
  const denom = positive + negative;
  return {
    mode,
    total: mine.length,
    positive,
    negative,
    accuracy: denom === 0 ? 0 : Math.round((positive / denom) * 100),
    bestStreak,
    lastTs,
  };
}

export function overallStats(attempts: Attempt[]) {
  const total = attempts.length;
  const positive = attempts.filter((a) => isPositive(a.outcome)).length;
  const negative = attempts.filter((a) => isNegative(a.outcome)).length;
  const denom = positive + negative;
  return {
    total,
    positive,
    negative,
    accuracy: denom === 0 ? 0 : Math.round((positive / denom) * 100),
  };
}

/** Returns one bucket per day for the last N days, oldest first. */
export function dailyBuckets(attempts: Attempt[], days = 14) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const dayMs = 86400000;
  const buckets = Array.from({ length: days }, (_, i) => {
    const dayStart = startOfToday - (days - 1 - i) * dayMs;
    return { dayStart, total: 0, positive: 0 };
  });
  for (const a of attempts) {
    const idx = Math.floor((a.ts - buckets[0].dayStart) / dayMs);
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].total++;
      if (isPositive(a.outcome)) buckets[idx].positive++;
    }
  }
  return buckets;
}
