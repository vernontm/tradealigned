import "server-only";
import OpenAI from "openai";
import { supabase, type Trade, type TranscriptChunk } from "./supabase";

const openai = new OpenAI();

export async function embedQuery(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return r.data[0].embedding;
}

/**
 * Cache of every teaching video's id + title. Used to detect when the user
 * references a specific lesson by name in their chat message so we can scope
 * retrieval to that video.
 *
 * Cached for 60s, title backfills are rare and a one-minute stale window is
 * fine. Cache is per-process so it warms up on first chat hit after deploy.
 */
type VideoTitle = {
  id: string;
  display_name: string;
  filename: string;
};
let titleCache: { at: number; rows: VideoTitle[] } | null = null;
const TITLE_CACHE_TTL_MS = 60_000;

async function loadVideoTitles(): Promise<VideoTitle[]> {
  const now = Date.now();
  if (titleCache && now - titleCache.at < TITLE_CACHE_TTL_MS) {
    return titleCache.rows;
  }
  const { data } = await supabase
    .from("videos")
    .select("id, display_name, filename")
    .eq("kind", "teaching")
    .order("display_name", { ascending: true });
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    display_name: r.display_name || r.filename,
    filename: r.filename,
  }));
  titleCache = { at: now, rows };
  return rows;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "to", "for", "with", "is",
  "are", "what", "how", "why", "does", "do", "did", "this", "that", "video",
  "lesson", "course", "mean", "means", "say", "says", "ray", "tgfx", "i",
  "you", "your", "about", "watch", "watched", "watching", "explain", "explains",
  "tell", "me", "from", "by", "at", "as",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Detect which course video (if any) the user is asking about. Returns the
 * top match if its score is meaningfully above noise, caller decides whether
 * to scope retrieval to that video.
 *
 * Scoring is intentionally simple: count overlapping content tokens between
 * the user's message and each title. We boost by the fraction of title tokens
 * matched (so a 3-word title with all 3 hit ranks above a 7-word title with
 * 3 hit).
 */
export async function detectReferencedVideo(query: string): Promise<{
  video_id: string;
  title: string;
  score: number;
} | null> {
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return null;

  const titles = await loadVideoTitles();
  let best: { id: string; title: string; score: number } | null = null;

  for (const v of titles) {
    const tTokens = tokens(v.display_name);
    if (tTokens.length === 0) continue;
    let hits = 0;
    for (const t of tTokens) if (qTokens.has(t)) hits++;
    if (hits === 0) continue;
    // Coverage of the title tells us "did they mean this one specifically?"
    const coverage = hits / tTokens.length;
    const score = hits + coverage;
    if (!best || score > best.score) {
      best = { id: v.id, title: v.display_name, score };
    }
  }

  // Threshold: at least 2 title tokens hit AND >40% title coverage. Single
  // generic-word matches like "wicks" or "trading" are too noisy to scope on.
  if (!best || best.score < 2.4) return null;
  return { video_id: best.id, title: best.title, score: best.score };
}

/**
 * Fetch transcript chunks for a single video, ordered chronologically. Used
 * when we've detected the user is asking about a specific lesson, we want
 * Ray AI to see the whole arc of the lesson, not just semantically-closest
 * snippets.
 */
async function fetchChunksForVideo(
  video_id: string,
  limit = 40
): Promise<TranscriptChunk[]> {
  const { data } = await supabase
    .from("transcript_chunks")
    .select("video_id, start_sec, end_sec, text, video_date")
    .eq("video_id", video_id)
    .order("start_sec", { ascending: true })
    .limit(limit);
  return (data as TranscriptChunk[] | null) ?? [];
}

export async function retrieveContext(query: string) {
  const emb = await embedQuery(query);
  const [tradesRes, chunksRes, referenced] = await Promise.all([
    supabase.rpc("match_trades", { query_embedding: emb, match_count: 6 }),
    supabase.rpc("match_chunks", { query_embedding: emb, match_count: 8 }),
    detectReferencedVideo(query),
  ]);
  const trades = (tradesRes.data as Trade[] | null) ?? [];
  const chunks = (chunksRes.data as TranscriptChunk[] | null) ?? [];

  let referencedVideo: {
    video_id: string;
    title: string;
    chunks: TranscriptChunk[];
  } | null = null;
  if (referenced) {
    const lessonChunks = await fetchChunksForVideo(referenced.video_id, 40);
    if (lessonChunks.length > 0) {
      referencedVideo = {
        video_id: referenced.video_id,
        title: referenced.title,
        chunks: lessonChunks,
      };
    }
  }
  return { trades, chunks, referencedVideo };
}

export function formatContextForLLM(ctx: {
  trades: Trade[];
  chunks: TranscriptChunk[];
  referencedVideo?: {
    video_id: string;
    title: string;
    chunks: TranscriptChunk[];
  } | null;
}) {
  const lines: string[] = [];

  // If the student named a specific lesson, surface its transcript first so
  // Ray AI grounds the answer in that exact video. Use showLesson(video_id,
  // start_sec) to drop the student into the moment.
  if (ctx.referencedVideo) {
    lines.push(
      `=== STUDENT IS ASKING ABOUT THIS SPECIFIC LESSON ===`
    );
    lines.push(
      `title: "${ctx.referencedVideo.title}"   video_id=${ctx.referencedVideo.video_id}`
    );
    lines.push(
      `Full transcript (chronological, ${ctx.referencedVideo.chunks.length} chunks). Quote and cite from THESE chunks when answering. Call showLesson with this video_id and the start_sec of the most relevant chunk.`
    );
    for (const c of ctx.referencedVideo.chunks) {
      const at =
        typeof c.start_sec === "number" ? `@${Math.round(c.start_sec)}s` : "";
      lines.push(`- [${at}] "${c.text.slice(0, 320)}"`);
    }
    lines.push("");
  }

  lines.push("=== RAY'S REAL TRADES (top matches) ===");
  for (const t of ctx.trades) {
    lines.push(
      `- id=${t.id} | [${t.video_date ?? "?"}] ${t.direction ?? "?"} ${t.instrument ?? "?"} | outcome=${t.final_outcome} | RR=${t.estimated_rr ?? "?"} | setup=${t.setup_type ?? "?"}`
    );
    if (t.reasoning) lines.push(`  reasoning: ${t.reasoning.slice(0, 360)}`);
  }
  lines.push("\n=== RAY'S SPOKEN TRANSCRIPT CHUNKS (semantic matches) ===");
  for (const c of ctx.chunks) {
    const meta: string[] = [];
    if (c.video_date) meta.push(c.video_date);
    if (typeof c.start_sec === "number") meta.push(`@${Math.round(c.start_sec)}s`);
    meta.push(`video_id=${c.video_id}`);
    lines.push(`- [${meta.join(" · ")}] "${c.text.slice(0, 320)}"`);
  }
  return lines.join("\n");
}

export { toMediaUrl } from "./media";
