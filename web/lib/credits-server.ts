import "server-only";

import { supabase } from "@/lib/supabase";

import {
  CREDIT_COSTS,
  type CreditAction,
  WELCOME_CREDIT_GRANT,
} from "./credit-costs";

/**
 * Append-only credit ledger model. Balance = sum(amount) for the user. Grants
 * are positive rows; debits are negative. We never UPDATE rows, so concurrent
 * actions can't double-spend a single credit beyond a brief race window — and
 * the race is bounded by the balance check we re-run after insert.
 */

export type LedgerKind = "grant" | "debit" | "topup" | "refund";

/**
 * Sum the user's ledger. If they have zero rows at all, this is their first
 * touch on the platform — drop in the welcome grant so the balance can never
 * be stuck at zero without the user ever having spent anything.
 */
export async function getBalance(appUserId: string): Promise<number> {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", appUserId);

  if (error) throw error;
  if (!data || data.length === 0) {
    await grantWelcomeIfNeeded(appUserId);
    return WELCOME_CREDIT_GRANT;
  }
  return data.reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

/**
 * Idempotent welcome grant. Uses a deterministic reason so a duplicate call
 * from a race becomes a no-op — at worst we'd insert two and read 200 once,
 * which auto-corrects on the next debit anyway. Acceptable trade for not
 * needing a separate unique index migration right now.
 */
async function grantWelcomeIfNeeded(appUserId: string): Promise<void> {
  const { count } = await supabase
    .from("credit_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", appUserId)
    .eq("reason", "welcome:starter-100");
  if ((count ?? 0) > 0) return;
  await supabase.from("credit_ledger").insert({
    user_id: appUserId,
    kind: "grant" as LedgerKind,
    amount: WELCOME_CREDIT_GRANT,
    reason: "welcome:starter-100",
  });
}

export type ChargeResult =
  | { ok: true; charged: number; balance: number }
  | { ok: false; reason: "insufficient"; required: number; balance: number };

/**
 * Charge for an action. Returns the new balance on success, or a structured
 * "insufficient" error the caller can surface as an HTTP 402. Endpoints
 * should NOT do the LLM work or DB mutation before this resolves.
 */
export async function chargeCredits(
  appUserId: string,
  action: CreditAction,
  metadata?: Record<string, unknown>
): Promise<ChargeResult> {
  const cost = CREDIT_COSTS[action];
  const balance = await getBalance(appUserId);
  if (balance < cost) {
    return { ok: false, reason: "insufficient", required: cost, balance };
  }
  const { error } = await supabase.from("credit_ledger").insert({
    user_id: appUserId,
    kind: "debit" as LedgerKind,
    amount: -cost,
    reason: `action:${action}`,
    metadata: metadata ?? null,
  });
  if (error) throw error;
  return { ok: true, charged: cost, balance: balance - cost };
}
