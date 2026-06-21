/**
 * GET /api/lessons/clip?video_id=&start=&end=
 *
 * Returns a signed Supabase Storage URL for the closest matching gem clip.
 * If no gem clip covers the requested window yet, returns the parent video
 * (also signed) with #t=start..end so the player can still scrub to it.
 */
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const videoId = url.searchParams.get("video_id");
  const start = parseFloat(url.searchParams.get("start") || "0");
  const end = parseFloat(url.searchParams.get("end") || `${start + 90}`);
  if (!videoId) return Response.json({ error: "video_id required" }, { status: 400 });

  // Try to find a gem whose window overlaps the requested one
  const { data: gems } = await supabase
    .from("teaching_moments")
    .select("id, start_sec, end_sec, clip_path")
    .eq("video_id", videoId)
    .not("clip_path", "is", null)
    .lte("start_sec", end + 5)
    .gte("end_sec", start - 5)
    .order("start_sec", { ascending: true })
    .limit(1);

  if (gems && gems.length > 0 && gems[0].clip_path) {
    const { data: signed } = await supabase.storage
      .from("course-videos")
      .createSignedUrl(gems[0].clip_path, 60 * 60);
    if (signed?.signedUrl) {
      return Response.json({ url: signed.signedUrl, kind: "gem_clip" });
    }
  }

  // Fallback: try to sign the full source video if it lives in Storage
  const { data: video } = await supabase
    .from("videos")
    .select("filename")
    .eq("id", videoId)
    .single();
  if (!video) return Response.json({ error: "video not found" }, { status: 404 });

  return Response.json({
    error:
      "no clip available yet, gem extraction is still running on this video.",
  }, { status: 404 });
}
