"use client";

/**
 * Anti-piracy watermark overlay.
 *
 * Renders the signed-in user's identity (display name + email) over a video
 * in a position that cycles every few seconds. Cycling through 8 anchor
 * positions makes it hard to crop out a single corner without losing visible
 * pixels in the next cycle. Pointer-events disabled so it never blocks the
 * video controls.
 */

import { useEffect, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-browser";

type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-right"
  | "bottom-right"
  | "bottom-center"
  | "bottom-left"
  | "middle-left";

const CYCLE: Anchor[] = [
  "bottom-left",
  "top-right",
  "top-left",
  "bottom-right",
  "middle-right",
  "bottom-center",
  "middle-left",
  "top-center",
];

const POSITION_CLASS: Record<Anchor, string> = {
  "top-left": "top-3 left-3",
  "top-center": "top-3 left-1/2 -translate-x-1/2",
  "top-right": "top-3 right-3",
  "middle-right": "top-1/2 right-3 -translate-y-1/2",
  "bottom-right": "bottom-3 right-3",
  "bottom-center": "bottom-3 left-1/2 -translate-x-1/2",
  "bottom-left": "bottom-3 left-3",
  "middle-left": "top-1/2 left-3 -translate-y-1/2",
};

const CYCLE_MS = 4500;

export function VideoWatermark({
  className = "",
}: {
  className?: string;
}) {
  const [identity, setIdentity] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user || !alive) return;
        const email = user.email ?? "anonymous";
        const name =
          (user.user_metadata as { full_name?: string })?.full_name ||
          email.split("@")[0];
        setIdentity({ name, email });
      } catch {
        // skip, no identity, no watermark
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!identity) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % CYCLE.length);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [identity]);

  if (!identity) return null;
  const pos = CYCLE[idx];

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 select-none ${className}`}
      aria-hidden
    >
      <div
        className={`absolute ${POSITION_CLASS[pos]} rounded-md bg-black/35 px-2 py-1 font-mono text-[10px] leading-tight text-white/85 shadow-sm backdrop-blur-sm transition-opacity duration-700`}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
      >
        <div className="font-semibold tracking-wide">{identity.name}</div>
        <div className="opacity-80">{identity.email}</div>
      </div>
    </div>
  );
}
