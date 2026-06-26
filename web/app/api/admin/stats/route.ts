/**
 * GET /api/admin/stats — global KPIs + per-student activity for the admin
 * dashboard. Admin-only. The dashboard polls this for near-real-time counts.
 */
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

async function requireAdmin() {
  const me = await getCurrentAppUser();
  if (!me || me.actualRole !== "admin") return false;
  return true;
}

function dayAgo(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // Global KPIs — a handful of count queries (head:true = count only).
  const head = { count: "exact" as const, head: true };
  const [
    totalStudents,
    new24h,
    new7d,
    activeSubs,
    totalLessons,
    chatTotal,
    drillTotal,
    adClicks,
  ] = await Promise.all([
    supabase.from("app_users").select("id", head),
    supabase.from("app_users").select("id", head).gte("created_at", dayAgo(1)),
    supabase.from("app_users").select("id", head).gte("created_at", dayAgo(7)),
    supabase.from("app_users").select("id", head).neq("tier", "free"),
    supabase.from("videos").select("id", head),
    supabase
      .from("credit_ledger")
      .select("id", head)
      .in("reason", ["action:chat", "action:chart_roast"]),
    supabase
      .from("credit_ledger")
      .select("id", head)
      .like("reason", "action:drill%"),
    supabase.from("activity_events").select("id", head).eq("type", "ad_click"),
  ]);

  // Per-student rows from the aggregation view, most-recently-active first.
  const { data: students, error } = await supabase
    .from("admin_student_stats")
    .select("*")
    .order("last_active", { ascending: false })
    .limit(500);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Revenue math. Monthly plan is $29.99. "active" subscriptions are billing
  // now (real MRR); "trialing" haven't paid the $29.99 yet (pending MRR once
  // their trial converts). past_due is counted as at-risk MRR.
  const MONTHLY_PRICE = 2999; // cents
  const rows = students ?? [];
  const activePaying = rows.filter(
    (s) => s.subscription_status === "active"
  ).length;
  const trialing = rows.filter(
    (s) => s.subscription_status === "trialing"
  ).length;
  const pastDue = rows.filter(
    (s) => s.subscription_status === "past_due"
  ).length;
  const mrrCents = activePaying * MONTHLY_PRICE;
  const pendingMrrCents = trialing * MONTHLY_PRICE;

  return Response.json({
    generated_at: new Date().toISOString(),
    kpis: {
      total_students: totalStudents.count ?? 0,
      new_24h: new24h.count ?? 0,
      new_7d: new7d.count ?? 0,
      active_subscribers: activeSubs.count ?? 0,
      total_lessons: totalLessons.count ?? 0,
      chat_messages: chatTotal.count ?? 0,
      drills_played: drillTotal.count ?? 0,
      ad_clicks: adClicks.count ?? 0,
      // billing
      mrr: mrrCents / 100,
      arr: (mrrCents * 12) / 100,
      pending_mrr: pendingMrrCents / 100,
      active_paying: activePaying,
      trialing,
      past_due: pastDue,
    },
    students: rows,
  });
}
