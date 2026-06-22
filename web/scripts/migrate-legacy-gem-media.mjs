#!/usr/bin/env node
/**
 * Upload teaching_moments (gem) clip/frame files that still live on local disk
 * (/Users/.../trade-analyzer/...) to the Supabase `course-videos` bucket under
 * the gems/<id>/ convention the working gems use, then rewrite the columns.
 *
 * Run from web/:
 *   node --env-file .env.local scripts/migrate-legacy-gem-media.mjs
 *
 * Idempotent: only touches columns still starting with "/Users/".
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const BUCKET = "course-videos";
const COLS = ["clip_path", "frame_path"];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function ctype(ext) {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".png") return "image/png";
  if (e === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

async function main() {
  const { data: rows, error } = await supabase
    .from("teaching_moments")
    .select(`id, ${COLS.join(", ")}`)
    .or(COLS.map((c) => `${c}.like./Users/*`).join(","));
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`scanned: ${rows.length} gems with legacy local media`);

  let uploaded = 0;
  let missing = 0;
  for (const row of rows) {
    for (const col of COLS) {
      const local = row[col];
      if (!local || !local.startsWith("/Users/")) continue;
      const ext = extname(local) || (col === "clip_path" ? ".mp4" : ".jpg");
      const key = `gems/${row.id}/${col === "clip_path" ? "clip" : "frame"}${ext}`;
      if (!existsSync(local)) {
        console.warn(`  skip ${row.id}.${col}: not on disk`);
        await supabase.from("teaching_moments").update({ [col]: null }).eq("id", row.id);
        missing++;
        continue;
      }
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(key, readFileSync(local), {
          contentType: ctype(ext),
          upsert: true,
        });
      if (upErr) {
        console.error(`  ✗ ${row.id}.${col}: ${upErr.message}`);
        continue;
      }
      const { error: dbErr } = await supabase
        .from("teaching_moments")
        .update({ [col]: key })
        .eq("id", row.id);
      if (dbErr) {
        console.error(`  ✗ ${row.id}.${col} db: ${dbErr.message}`);
        continue;
      }
      uploaded++;
      console.log(`  ✓ ${row.id}.${col} → ${key}`);
    }
  }
  console.log(`---\nuploaded: ${uploaded}, missing: ${missing}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
