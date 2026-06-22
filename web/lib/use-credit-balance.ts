"use client";

import { useCallback, useEffect, useState } from "react";

import { CREDIT_COSTS, type CreditAction } from "./credit-costs";

/**
 * Real-time credit balance hook. Components that trigger a charged action
 * call `applyDelta(newBalance)` (or `refresh()`) so every subscriber updates
 * without a round-trip. A custom event lets sibling components stay in sync
 * even if they don't share React state.
 */

const EVENT = "credits:balance";

export type CreditBalanceState = {
  balance: number | null;
  loading: boolean;
  /** Costs table, mirrored from the server so the UI can show "(10 credits)" */
  costs: Record<CreditAction, number>;
  refresh: () => Promise<void>;
  /** Set the balance to an exact value broadcast from a server response. */
  set: (next: number) => void;
};

export function useCreditBalance(): CreditBalanceState {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/credits/balance", { cache: "no-store" });
      if (!r.ok) {
        setBalance(null);
        return;
      }
      const j = (await r.json()) as { balance: number };
      setBalance(j.balance);
      dispatch(j.balance);
    } finally {
      setLoading(false);
    }
  }, []);

  const set = useCallback((next: number) => {
    setBalance(next);
    dispatch(next);
  }, []);

  useEffect(() => {
    refresh();
    function onChange(e: Event) {
      const v = (e as CustomEvent<number>).detail;
      if (typeof v === "number") setBalance(v);
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [refresh]);

  return { balance, loading, costs: CREDIT_COSTS, refresh, set };
}

function dispatch(next: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

/**
 * Broadcast a new balance from outside React (e.g. an event handler that
 * just got a `{ balance }` field back from a charged action). Subscribers
 * update in the same tick — no extra fetch needed.
 */
export function broadcastBalance(next: number) {
  dispatch(next);
}

export type ChargeOutcome =
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient" | "error"; balance: number | null };

/**
 * Charge the server for a single action and broadcast the resulting balance.
 * Games call this ONCE per session (at start), not per round. Returns a
 * structured outcome so callers can show an out-of-credits prompt.
 */
export async function chargeForAction(
  action: CreditAction
): Promise<ChargeOutcome> {
  try {
    const r = await fetch("/api/credits/charge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      balance?: number;
      error?: string;
    };
    if (r.status === 402) {
      if (typeof j.balance === "number") dispatch(j.balance);
      return { ok: false, reason: "insufficient", balance: j.balance ?? null };
    }
    if (!r.ok || typeof j.balance !== "number") {
      return { ok: false, reason: "error", balance: null };
    }
    dispatch(j.balance);
    return { ok: true, balance: j.balance };
  } catch {
    return { ok: false, reason: "error", balance: null };
  }
}
