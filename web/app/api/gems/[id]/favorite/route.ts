/**
 * POST   /api/gems/[id]/favorite  → favorite (idempotent upsert)
 * DELETE /api/gems/[id]/favorite  → unfavorite
 *
 * Per-user favorites live in the gem_favorites table. Used by the gem grid
 * to highlight + filter the gems a student has saved.
 */
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  const { id: gemId } = await ctx.params;
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: "not authenticated" }, { status: 401 });
  }
  const { error } = await supabase
    .from("gem_favorites")
    .upsert({ user_id: appUser.id, gem_id: gemId }, { onConflict: "user_id,gem_id" });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, favorited: true });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id: gemId } = await ctx.params;
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: "not authenticated" }, { status: 401 });
  }
  const { error } = await supabase
    .from("gem_favorites")
    .delete()
    .eq("user_id", appUser.id)
    .eq("gem_id", gemId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, favorited: false });
}
