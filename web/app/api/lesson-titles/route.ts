/**
 * GET /api/lesson-titles?ids=<id1>,<id2>,...
 *
 * Returns `{ titles: { [video_id]: display_name } }` so client-side caches
 * (e.g. course-touch in localStorage) can replace stale raw filenames with
 * the AI-generated display names.
 */
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
  if (ids.length === 0) return Response.json({ titles: {} });

  const { data, error } = await supabase
    .from("videos")
    .select("id, display_name, filename")
    .in("id", ids);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const titles: Record<string, string> = {};
  for (const v of data ?? []) {
    titles[v.id] = v.display_name || v.filename;
  }
  return Response.json({ titles });
}
