/**
 * GET /api/lessons/[id]/url
 *
 * Returns a signed URL for the lesson's video. Prefers the Supabase
 * `course-videos/lessons/<id>.mp4` upload; falls back to the S3 source
 * (signed via @aws-sdk) for lessons that haven't been uploaded yet.
 */
import { supabase } from "@/lib/supabase";
import { getKeyIndex, isS3Configured, presignKey } from "@/lib/s3";

const BUCKET = "course-videos";
const URL_TTL_SEC = 60 * 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const { data: video } = await supabase
    .from("videos")
    .select("id, filename, display_name, duration_sec, storage_path")
    .eq("id", id)
    .single();
  if (!video) {
    return Response.json({ error: "video not found" }, { status: 404 });
  }

  // 1. Prefer Supabase Storage
  if (video.storage_path) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(video.storage_path, URL_TTL_SEC);
    if (!error && data?.signedUrl) {
      return Response.json({
        url: data.signedUrl,
        title: video.display_name ?? video.filename,
        duration_sec: video.duration_sec ?? null,
        source: "supabase",
      });
    }
  }

  // 2. Fall back to S3 (lesson not yet uploaded to Supabase)
  if (!isS3Configured()) {
    return Response.json(
      { error: "lesson not yet uploaded and S3 fallback is not configured" },
      { status: 500 }
    );
  }
  const idx = await getKeyIndex();
  const key = idx[video.filename.toLowerCase()];
  if (!key) {
    return Response.json(
      { error: `lesson not yet available: ${video.filename}` },
      { status: 404 }
    );
  }
  const url = await presignKey(key, URL_TTL_SEC);
  return Response.json({
    url,
    title: video.display_name ?? video.filename,
    duration_sec: video.duration_sec ?? null,
    source: "s3",
  });
}
