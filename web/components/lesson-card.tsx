"use client";

import {
  ExternalLink,
  GraduationCap,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { open as markOpen, touch } from "@/lib/course-touch";

export type LessonSpec = {
  video_id: string;
  title: string;
  kind: string; // "teaching" | "trading"
  start_sec: number;
  end_sec: number;
  concept: string;
};

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function LessonCard({ lesson }: { lesson: LessonSpec }) {
  // We try gem clip first (cropped to the moment Ray teaches the concept).
  // If no gem clip exists for this video + start_sec window, fall back to the full video.
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mark this lesson as engaged the moment the card appears in the preview pane
  useEffect(() => {
    touch(lesson.video_id, lesson.title);
  }, [lesson.video_id, lesson.title]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/lessons/clip?video_id=${lesson.video_id}&start=${lesson.start_sec}&end=${lesson.end_sec}`
        );
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || `status ${r.status}`);
        if (alive) setSrc(j.url);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lesson.video_id, lesson.start_sec, lesson.end_sec]);

  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow">
          <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-100">
            {lesson.concept || lesson.title}
          </div>
          <div className="truncate text-[10px] text-zinc-500">
            from <strong className="text-zinc-300">{lesson.title}</strong> ·{" "}
            {fmtTime(lesson.start_sec)}, {fmtTime(lesson.end_sec)}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
        {loading && (
          <div className="flex aspect-video w-full items-center justify-center text-xs text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            loading lesson…
          </div>
        )}
        {error && (
          <div className="flex aspect-video w-full items-center justify-center px-4 text-center text-xs text-rose-300">
            {error}
          </div>
        )}
        {src && !loading && (
          <video
            src={src}
            controls
            autoPlay
            preload="metadata"
            className="block aspect-video w-full"
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
          <PlayCircle className="h-3 w-3" strokeWidth={2} />
          auto-cued to where Ray teaches it
        </span>
        <a
          href={`/api/lessons/${lesson.video_id}/page-redirect?at=${Math.floor(lesson.start_sec)}`}
          onClick={() => markOpen(lesson.video_id)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
          title={`open in library at ${fmtTime(lesson.start_sec)}`}
        >
          open in library · {fmtTime(lesson.start_sec)}
          <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
