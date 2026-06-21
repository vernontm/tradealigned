/**
 * GET /api/lessons/[id]/open?at=234
 *
 * Resolves the lesson video and 302-redirects to a signed playback URL with
 * a `#t=234` fragment so the HTML5 player seeks to the moment the concept
 * is taught. Prefers Supabase `videos.storage_path`; falls back to S3 when
 * the lesson hasn't been uploaded yet.
 */
import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getKeyIndex, isS3Configured, presignKey } from "@/lib/s3";

const BUCKET = "course-videos";
const URL_TTL_SEC = 60 * 60;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const at = parseFloat(req.nextUrl.searchParams.get("at") || "0");
  const frag = `#t=${Math.max(0, Math.floor(at))}`;

  const { data: video } = await supabase
    .from("videos")
    .select("id, filename, display_name, storage_path")
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
      return NextResponse.redirect(`${data.signedUrl}${frag}`, { status: 302 });
    }
  }

  // 2. Fall back to S3
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
      { error: `source video not available: ${video.filename}` },
      { status: 404 }
    );
  }
  const url = await presignKey(key, URL_TTL_SEC);
  return NextResponse.redirect(`${url}${frag}`, { status: 302 });
}
