"use client";

/**
 * Per-browser credit tracker. Until Clerk + Supabase sync land, every feature
 * usage debits a local balance. Same costs as `pricing.json`.
 */

export type ChargeKind = "chat" | "chart_roast" | "quiz_question" | "video_clip";

export const CREDIT_COSTS: Record<ChargeKind, number> = {
  chat: 5,
  chart_roast: 15,
  quiz_question: 3,
  video_clip: 1,
};

const STARTING_BALANCE = 100; // free-tier-ish default for the demo
const STORAGE_KEY = "ray-ai-credits.v1";

type StoredState = { balance: number; startingBalance: number };

function readState(): StoredState {
  if (typeof window === "undefined")
    return { balance: STARTING_BALANCE, startingBalance: STARTING_BALANCE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { balance: STARTING_BALANCE, startingBalance: STARTING_BALANCE };
    const j = JSON.parse(raw) as Partial<StoredState>;
    return {
      balance: typeof j.balance === "number" ? j.balance : STARTING_BALANCE,
      startingBalance:
        typeof j.startingBalance === "number"
          ? j.startingBalance
          : STARTING_BALANCE,
    };
  } catch {
    return { balance: STARTING_BALANCE, startingBalance: STARTING_BALANCE };
  }
}

function writeState(s: StoredState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("ray-credits-changed"));
  } catch {
    // ignore
  }
}

export function getBalance(): number {
  return readState().balance;
}

export function getStartingBalance(): number {
  return readState().startingBalance;
}

/**
 * Attempt to debit credits for the action. Returns the resulting state so the
 * caller can short-circuit on insufficient balance.
 */
export function charge(kind: ChargeKind): {
  ok: boolean;
  newBalance: number;
  cost: number;
} {
  const cost = CREDIT_COSTS[kind];
  const state = readState();
  if (state.balance < cost) {
    return { ok: false, newBalance: state.balance, cost };
  }
  const next = { ...state, balance: state.balance - cost };
  writeState(next);
  return { ok: true, newBalance: next.balance, cost };
}

export function reset(balance = STARTING_BALANCE) {
  writeState({ balance, startingBalance: balance });
}

export function onCreditsChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-credits-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) cb();
  });
  return () => window.removeEventListener("ray-credits-changed", handler);
}
