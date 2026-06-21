/**
 * POST /api/lesson-progress
 * Body: { lesson_id, position_sec, completed? }
 *
 * Upserts the student's progress on a lesson. Throttle the client to ~5s
 * intervals, every call writes one row.
 */
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    lesson_id?: string;
    position_sec?: number;
    completed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.lesson_id) {
    return Response.json({ error: "lesson_id required" }, { status: 400 });
  }
  const position = Number.isFinite(body.position_sec) ? body.position_sec! : 0;
  const completed = !!body.completed;

  const { error } = await sb.from("lesson_progress").upsert(
    {
      auth_user_id: user.id,
      lesson_id: body.lesson_id,
      position_sec: position,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id,lesson_id" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
