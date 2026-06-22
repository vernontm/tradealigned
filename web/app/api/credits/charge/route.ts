/**
 * POST /api/credits/charge
 *
 * Used by client-only mini-games (replay, sniper, speed) that don't naturally
 * hit the server during a round but still need to debit credits. The price
 * is looked up from CREDIT_COSTS so the client can't underpay.
 *
 * Body: { action: CreditAction }
 * Returns: { balance, charged } on success, 402 on insufficient credits.
 */
import {
  CREDIT_COSTS,
  type CreditAction,
} from "@/lib/credit-costs";
import { chargeCredits } from "@/lib/credits-server";
import { getCurrentAppUser } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = (body as { action?: string }).action;
  if (!action || !(action in CREDIT_COSTS)) {
    return Response.json(
      { error: "unknown action" },
      { status: 400 }
    );
  }
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: "not authenticated" }, { status: 401 });
  }
  const result = await chargeCredits(appUser.id, action as CreditAction);
  if (!result.ok) {
    return Response.json(
      {
        error: "insufficient_credits",
        required: result.required,
        balance: result.balance,
      },
      { status: 402 }
    );
  }
  return Response.json({ balance: result.balance, charged: result.charged });
}
