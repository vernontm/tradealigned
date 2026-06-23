/**
 * POST /api/events  — log a lightweight activity event for the current user.
 * Body: { type: EventType, metadata?: object }
 *
 * Fire-and-forget from the client (see lib/log-event.ts). Used by the admin
 * dashboard to show logins, sponsor-ad clicks, searches, and gem views.
 * Chat/drill/gem-unlock usage is already captured in credit_ledger, so this
 * only covers the gaps.
 */
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

const ALLOWED = new Set([
  "login",
  "ad_click",
  "search",
  "gem_view",
  "chat",
  "drill_play",
  "lesson_view",
]);

export async function POST(req: Request) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    // Silently accept — we don't want logging failures to surface to users.
    return Response.json({ ok: false }, { status: 200 });
  }
  let body: { type?: string; metadata?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
  const type = body.type;
  if (!type || !ALLOWED.has(type)) {
    return Response.json({ ok: false }, { status: 200 });
  }
  await supabase.from("activity_events").insert({
    user_id: appUser.id,
    type,
    metadata: body.metadata ?? null,
  });
  return Response.json({ ok: true });
}
