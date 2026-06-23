/**
 * GET /api/admin/student-activity?user_id=…
 * Admin-only. Returns a student's recent chat queries + searches so an admin
 * can see exactly what they asked Trade AI and searched for.
 */
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const me = await getCurrentAppUser();
  if (!me || me.actualRole !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) {
    return Response.json({ error: "user_id required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("activity_events")
    .select("type, metadata, created_at")
    .eq("user_id", userId)
    .in("type", ["chat", "search"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ events: data ?? [] });
}
