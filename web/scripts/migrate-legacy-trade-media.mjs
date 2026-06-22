#!/usr/bin/env node
/**
 * One-shot: upload trade frame JPGs + clip MP4s that still live on Ray's
 * local disk (/Users/.../trade-analyzer/trades/...) to the Supabase Storage
 * `trade-clips` bucket, then rewrite the DB columns to use the new keys.
 *
 * Why: when the /media symlink was removed to unblock the Vercel build, every
 * trade whose entry_frame_path / clip_path still pointed at /Users/... started
 * 404-ing in production. This catches them up to the Supabase-Storage scheme
 * the rest of the app already uses.
 *
 * Idempotent: each (row, column) pair is only touched if it still starts with
 * "/Users/", so re-running after an interruption picks up where it left off.
 *
 * Run from the repo root with the web app's env file loaded:
 *
 *   node --env-file web/.env.local scripts/migrate-legacy-trade-media.mjs
 *
 * Add --frames-only to skip the larger clip uploads on first pass.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, basename } from "node:path";

const BUCKET = "trade-clips";
const PATH_COLUMNS = [
  "entry_frame_path",
  "exit_frame_path",
  "entry_clip_path",
  "exit_clip_path",
  "trade_clip_path",
];

const FRAMES_ONLY = process.argv.includes("--frames-only");
const FRAME_COLS = new Set(["entry_frame_path", "exit_frame_path"]);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. load env with --env-file web/.env.local"
  );
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function contentTypeFor(ext) {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".mp4") return "video/mp4";
  if (e === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

async function uploadOne(localPath, key) {
  const body = readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, body, {
      contentType: contentTypeFor(extname(localPath)),
      upsert: true,
    });
  if (error) throw new Error(`upload ${key}: ${error.message}`);
  return body.byteLength;
}

async function main() {
  const filter = PATH_COLUMNS.map((c) => `${c}.like.${"/Users/"}*`).join(",");
  const { data: rows, error } = await supabase
    .from("trades")
    .select(`id, ${PATH_COLUMNS.join(", ")}`)
    .or(filter);
  if (error) {
    console.error("query failed:", error.message);
    process.exit(1);
  }
  console.log(`scanned: ${rows.length} trades with at least one legacy path`);
  if (FRAMES_ONLY) console.log("frames-only mode: skipping .mp4 clip uploads");

  let uploaded = 0;
  let skippedMissing = 0;
  let totalBytes = 0;

  for (const row of rows) {
    for (const col of PATH_COLUMNS) {
      const localPath = row[col];
      if (!localPath || !localPath.startsWith("/Users/")) continue;
      if (FRAMES_ONLY && !FRAME_COLS.has(col)) continue;

      if (!existsSync(localPath)) {
        console.warn(`  skip ${row.id}.${col}: file not on disk (${localPath})`);
        skippedMissing++;
        // null out so the URL helper stops emitting broken /media links
        const { error: upd } = await supabase
          .from("trades")
          .update({ [col]: null })
          .eq("id", row.id);
        if (upd) console.warn(`    null update failed: ${upd.message}`);
        continue;
      }

      const ext = extname(localPath) || ".bin";
      const key = `${row.id}/${col}${ext}`;

      try {
        const sizeBytes = await uploadOne(localPath, key);
        const { error: upd } = await supabase
          .from("trades")
          .update({ [col]: key })
          .eq("id", row.id);
        if (upd) throw new Error(`db update: ${upd.message}`);
        uploaded++;
        totalBytes += sizeBytes;
        const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
        console.log(
          `  ✓ ${row.id}.${col}  ${basename(localPath)}  (${sizeMB} MB) → ${key}`
        );
      } catch (e) {
        console.error(`  ✗ ${row.id}.${col}: ${e.message}`);
      }
    }
  }

  console.log("---");
  console.log(`uploaded: ${uploaded}`);
  console.log(`skipped (missing on disk): ${skippedMissing}`);
  console.log(`total uploaded: ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
