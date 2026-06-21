"use client";

/**
 * Per-browser tracker for "which course videos has this student engaged with?"
 *
 * - `touch(video_id)`: marked when a LessonCard renders (Ray AI cited the video)
 * - `open(video_id)`:  marked when the student clicks "watch in full lesson"
 *
 * Designed to migrate to a Supabase `lesson_touches` table once auth lands.
 */

const STORAGE_KEY = "ray-ai-course-touches.v1";

export type Touch = {
  video_id: string;
  title: string;
  first_touched_at: number;
  last_touched_at: number;
  opened_full: boolean;
  opened_at: number | null;
  touches: number;
};

type State = Record<string, Touch>;

function read(): State {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as State) : {};
  } catch {
    return {};
  }
}

function write(s: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("ray-course-touches-changed"));
  } catch {
    // ignore quota
  }
}

export function touch(videoId: string, title: string) {
  if (!videoId) return;
  const s = read();
  const now = Date.now();
  const existing = s[videoId];
  s[videoId] = existing
    ? {
        ...existing,
        title: existing.title || title,
        last_touched_at: now,
        touches: (existing.touches ?? 0) + 1,
      }
    : {
        video_id: videoId,
        title,
        first_touched_at: now,
        last_touched_at: now,
        opened_full: false,
        opened_at: null,
        touches: 1,
      };
  write(s);
}

export function open(videoId: string) {
  const s = read();
  const t = s[videoId];
  if (!t) return;
  s[videoId] = { ...t, opened_full: true, opened_at: Date.now() };
  write(s);
}

export function getTouches(): Touch[] {
  return Object.values(read()).sort(
    (a, b) => b.last_touched_at - a.last_touched_at
  );
}

/**
 * Replace cached titles with the current display_names from the server.
 * Early touches were seeded with raw filenames (e.g. "video1677039331")
 * before AI display names existed. Call this once on /progress mount to
 * upgrade them to the clean AI titles. No-op when nothing needs updating.
 */
export async function refreshTitles(): Promise<void> {
  if (typeof window === "undefined") return;
  const state = read();
  const ids = Object.keys(state);
  if (ids.length === 0) return;
  try {
    const r = await fetch(`/api/lesson-titles?ids=${ids.join(",")}`);
    if (!r.ok) return;
    const { titles } = (await r.json()) as { titles: Record<string, string> };
    if (!titles) return;
    let changed = false;
    const next: State = { ...state };
    for (const id of ids) {
      const fresh = titles[id];
      if (!fresh) continue;
      if (next[id].title !== fresh) {
        next[id] = { ...next[id], title: fresh };
        changed = true;
      }
    }
    if (changed) write(next);
  } catch {
    // network blip, keep old titles
  }
}

export function clearAll() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("ray-course-touches-changed"));
}

export function onTouchesChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-course-touches-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) cb();
  });
  return () => window.removeEventListener("ray-course-touches-changed", handler);
}
