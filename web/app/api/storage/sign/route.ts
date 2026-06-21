/**
 * GET /api/storage/sign?key=<key>&bucket=<bucket>&redirect=1
 *
 * Returns a short-lived signed URL for a private object. With ?redirect=1 it
 * 302's straight to the signed URL, useful when you want a stable href like
 * `<img src="/api/storage/sign?...">` without an extra round-trip.
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_BUCKET = "course-videos";
const TTL_SEC = 60 * 60 * 6;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const bucket = url.searchParams.get("bucket") ?? DEFAULT_BUCKET;
  const redirect = url.searchParams.get("redirect") === "1";
  if (!key) return Response.json({ error: "key required" }, { status: 400 });

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, TTL_SEC);
  if (error || !data?.signedUrl) {
    return Response.json(
      { error: error?.message ?? "sign failed" },
      { status: 500 }
    );
  }
  if (redirect) return NextResponse.redirect(data.signedUrl, { status: 302 });
  return Response.json({ url: data.signedUrl });
}
