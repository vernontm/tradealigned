"use client";

/**
 * Fire-and-forget activity logging. Never throws, never blocks the UI — if the
 * request fails we just drop the event. Powers the admin analytics dashboard.
 */

export type EventType =
  | "login"
  | "ad_click"
  | "search"
  | "gem_view"
  | "chat"
  | "drill_play"
  | "lesson_view";

export function logEvent(type: EventType, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, metadata }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Log an event at most once per browser session (e.g. "login"). Uses
 * sessionStorage so a page refresh within the same tab session doesn't
 * double-count.
 */
export function logEventOncePerSession(
  type: EventType,
  metadata?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  const key = `evt-once:${type}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage unavailable — just log it.
  }
  logEvent(type, metadata);
}
