"use client";

import { useEffect, useState } from "react";

/**
 * Live "students online" badge. Pings /api/presence on an interval, which both
 * stamps this user's heartbeat and returns the current online count (anyone
 * seen in the last 2 minutes). Render only for authenticated users.
 */

const PING_MS = 40_000;

export function OnlineBadge() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const r = await fetch("/api/presence", {
          method: "POST",
          cache: "no-store",
        });
        if (!r.ok) return;
        const j = (await r.json()) as { online?: number };
        if (alive && typeof j.online === "number") setOnline(j.online);
      } catch {
        // ignore — best effort
      }
    };
    ping();
    const id = setInterval(ping, PING_MS);
    // Re-ping when the tab refocuses so the count feels fresh on return.
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (online === null) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      {online.toLocaleString()} online
    </div>
  );
}
