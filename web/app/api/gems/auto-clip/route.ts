/**
 * POST /api/gems/auto-clip
 * Body: { gem_id: string }
 *
 * Workflow:
 *   1. Look up the gem and (if known) the source video.
 *   2. Embed the gem's quote.
 *   3. Find the matching transcript chunk(s), pgvector cosine search.
 *      If the gem already has a `video_id`, scope the search to that video.
 *      Otherwise, search the full corpus and infer the video from the top hit.
 *   4. Compute a clip window with a small pad on each side.
 *   5. Cut the clip with ffmpeg from the original source video.
 *   6. Persist `video_id`, `start_sec`, `end_sec`, `clip_path` on the gem row.
 *
 * Output clips land at:
 *   ~/Desktop/trade-analyzer/trades/<video_stem>/gems/<gem_id>.mp4
 * which the existing /media/* symlink already serves to the browser.
 */
import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const TRADES_ROOT = join(homedir(), "Desktop/trade-analyzer/trades");
const EMBED_MODEL = "text-embedding-3-small";
const PAD_BEFORE = 4; // seconds of context before the quote
const PAD_AFTER = 4; // seconds of context after
const MAX_CLIP_SECS = 90; // hard cap to keep things sane

const openai = new OpenAI();

type VideoRow = {
  filename: string | null;
  source_path: string | null;
};
type GemRow = {
  id: string;
  quote: string;
  video_id: string | null;
  start_sec: number | null;
  end_sec: number | null;
  clip_path: string | null;
  videos?: VideoRow | VideoRow[] | null;
};
type ChunkHit = {
  id: string;
  video_id: string;
  start_sec: number;
  end_sec: number;
  text: string;
  similarity: number;
};

const flatVideo = (v: GemRow["videos"]): VideoRow | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const stemOf = (filename: string | null): string | null =>
  filename ? filename.replace(/\.[^./]+$/, "") : null;

async function embed(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text.slice(0, 2000),
  });
  return r.data[0].embedding;
}

async function ffmpegCut(
  source: string,
  startSec: number,
  durSec: number,
  outPath: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      String(Math.max(0, startSec)),
      "-i",
      source,
      "-t",
      String(Math.max(1, durSec)),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-400)}`))
    );
    proc.on("error", reject);
  });
}

export async function POST(req: Request) {
  let body: { gem_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const gem_id = body.gem_id;
  if (!gem_id) {
    return Response.json({ error: "gem_id required" }, { status: 400 });
  }

  // 1. Load the gem (with optional joined video)
  const { data: gemData, error: gemErr } = await supabase
    .from("teaching_moments")
    .select(
      "id, quote, video_id, start_sec, end_sec, clip_path, videos(filename, source_path)"
    )
    .eq("id", gem_id)
    .single();
  if (gemErr || !gemData) {
    return Response.json({ error: "gem not found" }, { status: 404 });
  }
  const gem = gemData as GemRow;

  if (!gem.quote || !gem.quote.trim()) {
    return Response.json({ error: "gem has no quote" }, { status: 400 });
  }

  // 2. Embed the quote
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embed(gem.quote);
  } catch (e) {
    return Response.json(
      { error: `embedding failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  // 3. Find matching transcript chunk(s).
  let bestVideoId = gem.video_id;
  let bestStart: number | null = null;
  let bestEnd: number | null = null;
  let bestSimilarity = 0;
  const debug: Record<string, unknown> = {
    embedding_dims: queryEmbedding.length,
    quote_len: gem.quote.length,
    has_video_id: !!gem.video_id,
  };

  // Try a few encodings of the embedding because pgvector via PostgREST is
  // picky, sometimes it wants an array, sometimes a string literal.
  async function tryRpc(name: string, payload: Record<string, unknown>) {
    const res = await supabase.rpc(name, payload);
    return {
      data: (res.data as ChunkHit[] | null) ?? [],
      error: res.error?.message ?? null,
    };
  }

  async function vectorSearch(): Promise<ChunkHit[]> {
    const literal = `[${queryEmbedding.join(",")}]`;
    if (gem.video_id) {
      // Try array form first (matches lib/retrieve.ts which works for chat)
      const a = await tryRpc("match_chunks_in_video", {
        query_embedding: queryEmbedding,
        vid: gem.video_id,
        match_count: 5,
      });
      debug.in_video_array = { count: a.data.length, error: a.error };
      if (a.data.length) return a.data;
      const b = await tryRpc("match_chunks_in_video", {
        query_embedding: literal,
        vid: gem.video_id,
        match_count: 5,
      });
      debug.in_video_literal = { count: b.data.length, error: b.error };
      if (b.data.length) return b.data;
      return [];
    }
    const a = await tryRpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_count: 5,
    });
    debug.global_array = { count: a.data.length, error: a.error };
    if (a.data.length) return a.data;
    const b = await tryRpc("match_chunks", {
      query_embedding: literal,
      match_count: 5,
    });
    debug.global_literal = { count: b.data.length, error: b.error };
    return b.data;
  }

  let hits = await vectorSearch();

  // Fallback: text-based search using pg_trgm if vector search returned nothing
  if (hits.length === 0) {
    // Pull distinctive ~6-word phrase fragments from the quote and ILIKE-match
    const cleanQuote = gem.quote
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
    // Take the longest meaningful slice
    const phrase = cleanQuote.slice(0, 6).join(" ");
    debug.fallback_phrase = phrase;
    if (phrase) {
      let q = supabase
        .from("transcript_chunks")
        .select("id, video_id, start_sec, end_sec, text")
        .ilike("text", `%${phrase}%`)
        .limit(5);
      if (gem.video_id) q = q.eq("video_id", gem.video_id);
      const { data, error } = await q;
      debug.fallback_error = error?.message ?? null;
      debug.fallback_count = data?.length ?? 0;
      if (data && data.length > 0) {
        hits = (data as Omit<ChunkHit, "similarity">[]).map((h) => ({
          ...h,
          similarity: 0.5,
        }));
      }
    }
    // Last-ditch trigram: try the shortest distinctive substring
    if (hits.length === 0 && cleanQuote.length > 0) {
      const short = cleanQuote.slice(0, 3).join(" ");
      debug.fallback_short = short;
      if (short && short !== debug.fallback_phrase) {
        let q = supabase
          .from("transcript_chunks")
          .select("id, video_id, start_sec, end_sec, text")
          .ilike("text", `%${short}%`)
          .limit(5);
        if (gem.video_id) q = q.eq("video_id", gem.video_id);
        const { data } = await q;
        debug.fallback_short_count = data?.length ?? 0;
        if (data && data.length > 0) {
          hits = (data as Omit<ChunkHit, "similarity">[]).map((h) => ({
            ...h,
            similarity: 0.3,
          }));
        }
      }
    }
  }

  if (hits.length === 0) {
    return Response.json(
      {
        error:
          "couldn't locate this quote in any video transcript. try a longer or more verbatim quote, or attach the gem to a specific video.",
        debug,
      },
      { status: 404 }
    );
  }

  const top = hits[0];
  bestVideoId = top.video_id;
  bestStart = top.start_sec;
  bestEnd = top.end_sec;
  bestSimilarity = top.similarity;

  if (!bestVideoId || bestStart == null || bestEnd == null) {
    return Response.json({ error: "could not locate clip" }, { status: 500 });
  }

  // 4. Compute window
  const rawStart = Math.max(0, bestStart - PAD_BEFORE);
  const rawEnd = bestEnd + PAD_AFTER;
  const duration = Math.min(MAX_CLIP_SECS, Math.max(2, rawEnd - rawStart));

  // 5. Look up source path (we may not have joined it)
  let videoRow = flatVideo(gem.videos);
  if (!videoRow || videoRow.source_path === undefined) {
    const { data: v } = await supabase
      .from("videos")
      .select("filename, source_path")
      .eq("id", bestVideoId)
      .single();
    videoRow = v ?? null;
  }
  if (!videoRow?.source_path) {
    return Response.json(
      { error: "source video path unknown" },
      { status: 500 }
    );
  }
  if (!existsSync(videoRow.source_path)) {
    return Response.json(
      {
        error: `source video not on disk: ${videoRow.source_path}`,
      },
      { status: 500 }
    );
  }

  const stem = stemOf(videoRow.filename);
  if (!stem) {
    return Response.json({ error: "video stem unknown" }, { status: 500 });
  }
  const outDir = join(TRADES_ROOT, stem, "gems");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${gem_id}.mp4`);

  // 6. ffmpeg cut
  try {
    await ffmpegCut(videoRow.source_path, rawStart, duration, outPath);
  } catch (e) {
    return Response.json(
      { error: `cut failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  // 7. Persist
  const { error: updErr } = await supabase
    .from("teaching_moments")
    .update({
      video_id: bestVideoId,
      start_sec: rawStart,
      end_sec: rawStart + duration,
      clip_path: outPath,
    })
    .eq("id", gem_id);
  if (updErr) {
    return Response.json({ error: updErr.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    video_id: bestVideoId,
    start_sec: rawStart,
    end_sec: rawStart + duration,
    duration,
    similarity: bestSimilarity,
    clip_path: outPath,
  });
}
