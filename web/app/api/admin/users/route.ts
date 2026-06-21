/**
 * Admin-only endpoints for user management.
 * Uses the service-role Supabase client to bypass RLS, we double-check the
 * caller's role first so this can't be abused.
 */
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

async function requireAdmin() {
  const me = await getCurrentAppUser();
  // Use actualRole so /admin user management still works even when the admin
  // is impersonating a student via the view-as toggle. The toggle is a UI
  // device, not a sandbox, admins can always perform real admin actions.
  if (!me || me.actualRole !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";

  let sel = supabase
    .from("admin_users_view")
    .select("*", { count: "exact" })
    .order("auth_created_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (q) sel = sel.ilike("email", `%${q}%`);

  const { data, count, error } = await sel;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ users: data ?? [], total: count ?? 0 });
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: {
    app_user_id?: string;
    role?: "user" | "admin";
    tier?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.app_user_id) {
    return Response.json({ error: "app_user_id required" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (body.role && ["user", "admin"].includes(body.role)) {
    patch.role = body.role;
  }
  if (body.tier) {
    patch.tier = body.tier;
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "no changes" }, { status: 400 });
  }
  const { error } = await supabase
    .from("app_users")
    .update(patch)
    .eq("id", body.app_user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
