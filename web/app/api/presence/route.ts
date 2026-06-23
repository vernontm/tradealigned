/**
 * POST /api/presence — heartbeat. Stamps the current user's last_seen_at and
 * returns how many students are currently online (seen in the last 2 min).
 * The OnlineBadge pings this on an interval; one round-trip both updates and
 * reads, so it's cheap.
 */
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export async function POST() {
  const appUser = await getCurrentAppUser();
  // Even unauthenticated callers get the count (used on public-ish pages),
  // but only authenticated users update their own heartbeat.
  if (appUser) {
    await supabase
      .from("app_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", appUser.id);
  }

  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .gte("last_seen_at", since);

  return Response.json({ online: count ?? 0 });
}
