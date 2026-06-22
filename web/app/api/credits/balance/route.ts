/**
 * GET /api/credits/balance
 *
 * Returns the current user's credit balance plus the price-per-action table
 * so the UI can render "cost: 10 credits" hints without duplicating the
 * numbers. Caller must be authenticated.
 */
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { getBalance } from "@/lib/credits-server";
import { getCurrentAppUser } from "@/lib/supabase-server";

export async function GET() {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: "not authenticated" }, { status: 401 });
  }
  const balance = await getBalance(appUser.id);
  return Response.json({
    balance,
    costs: CREDIT_COSTS,
  });
}
