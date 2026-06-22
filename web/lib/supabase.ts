import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy proxy so the module can be imported during the Next build's
// "Collecting page data" phase without env vars set yet. The real client is
// created on first method access; routes that hit Supabase at runtime get a
// clear error if vars are missing instead of a build crash.
function buildClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

let _client: SupabaseClient | null = null;
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!_client) _client = buildClient();
    return Reflect.get(_client as object, prop);
  },
});

export type { Trade, TranscriptChunk } from "./types";
