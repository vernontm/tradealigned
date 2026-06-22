"use client";

import { Coins, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCreditBalance } from "@/lib/use-credit-balance";

/**
 * Live credit balance pill, drops into the sidebar / mobile nav. Subscribes
 * to the `credits:balance` event so every action everywhere in the app
 * updates this number in the same tick.
 */
export function CreditsBadge() {
  const { balance, loading } = useCreditBalance();

  if (balance === null && !loading) return null;

  const low = balance !== null && balance < 10;

  return (
    <Link
      href="/pricing"
      title="credits remaining · top up"
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium ring-1 transition hover:opacity-90 ${
        low
          ? "bg-rose-500/10 text-rose-200 ring-rose-400/30"
          : "bg-emerald-500/10 text-emerald-200 ring-emerald-400/30"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {loading && balance === null ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : low ? (
          <Sparkles className="h-3 w-3" strokeWidth={2.5} />
        ) : (
          <Coins className="h-3 w-3" strokeWidth={2.5} />
        )}
        <span>{balance ?? "—"}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          credits
        </span>
      </span>
      <span className="text-[10px] opacity-70">
        {low ? "top up" : "manage"}
      </span>
    </Link>
  );
}
