/**
 * Convert a stored asset path into a URL the browser can render.
 *
 * Three formats supported:
 *   1. Legacy absolute local paths (`/Users/.../trade-analyzer/trades/...`)
 *      → mapped to /media/* which a static handler serves from disk.
 *   2. Gem clips/frames in `course-videos/gems/...` (uploaded by
 *      extract_course_gems.py) → routed to the storage sign endpoint.
 *   3. Trade clips/frames stored as plain keys (e.g.
 *      `<video_id>/<idx>/trade.mp4`) → routed to the `trade-clips` bucket.
 *
 * The sign endpoint 302-redirects to a short-lived signed URL so this
 * function can stay synchronous.
 */
const TRADE_CLIPS_BUCKET = "trade-clips";
const COURSE_VIDEOS_BUCKET = "course-videos";

export function toMediaUrl(absPath: string | null | undefined): string | null {
  if (!absPath) return null;
  // Legacy local path
  const m = absPath.match(/\/trade-analyzer\/trades\/(.+)$/);
  if (m) return `/media/${m[1]}`;
  // Supabase Storage key (no leading slash, no scheme)
  if (!absPath.startsWith("/") && !absPath.startsWith("http")) {
    const bucket = absPath.startsWith("gems/")
      ? COURSE_VIDEOS_BUCKET
      : TRADE_CLIPS_BUCKET;
    const enc = encodeURIComponent(absPath);
    return `/api/storage/sign?bucket=${bucket}&key=${enc}&redirect=1`;
  }
  return null;
}
