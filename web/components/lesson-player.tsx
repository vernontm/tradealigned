"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  Minimize,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { VideoWatermark } from "@/components/video-watermark";

type Props = {
  lessonId: string;
  courseSlug: string;
  prevHref: string | null;
  nextHref: string | null;
  prevTitle?: string | null;
  nextTitle?: string | null;
  positionLabel?: string | null;
  initialPosition: number;
  initialCompleted: boolean;
  backHref: string;
};

const SAVE_EVERY_MS = 5_000;
const COMPLETE_AT = 0.92;

export function LessonPlayer({
  lessonId,
  prevHref,
  nextHref,
  prevTitle,
  nextTitle,
  positionLabel,
  initialPosition,
  initialCompleted,
  backHref,
}: Props) {
  const router = useRouter();
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(initialCompleted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch a signed URL for the video
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/lessons/${lessonId}/url`);
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
  }, [lessonId]);

  // Resume to saved position once loaded
  useEffect(() => {
    if (!src || !videoRef.current || initialPosition <= 1) return;
    const v = videoRef.current;
    const onLoaded = () => {
      try {
        v.currentTime = initialPosition;
      } catch {
        // ignore
      }
    };
    v.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [src, initialPosition]);

  // Fullscreen on the WRAPPER (which contains both <video> and the watermark)
  // so the watermark stays visible. We use a custom button instead of the
  // native <video> fullscreen control: the old approach intercepted the
  // native button and tried exitFullscreen()→requestFullscreen() in sequence,
  // but the re-request lands outside the user-gesture window and browsers
  // reject it, leaving the user in NO fullscreen at all. Requesting directly
  // from a click handler keeps the gesture intact.
  const toggleFullscreen = useCallback(async () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (wrapper.requestFullscreen) {
        await wrapper.requestFullscreen();
      } else {
        // iOS Safari: no Element.requestFullscreen — fall back to the native
        // video player fullscreen (watermark won't show, but it works).
        const v = videoRef.current as
          | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
          | null;
        v?.webkitEnterFullscreen?.();
      }
    } catch {
      // Some browsers reject if not in a gesture; the button is in one, so
      // this is rare. Swallow and let the user retry.
    }
  }, []);

  // Track fullscreen state so the button icon reflects it.
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const persist = useCallback(
    (positionSec: number, complete: boolean) => {
      void fetch("/api/lesson-progress", {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          position_sec: Math.max(0, Math.round(positionSec)),
          completed: complete,
        }),
      });
    },
    [lessonId]
  );

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    if (now - lastSaved.current < SAVE_EVERY_MS) return;
    lastSaved.current = now;
    const dur = v.duration || 0;
    const watched = dur > 0 ? v.currentTime / dur : 0;
    if (!completed && watched >= COMPLETE_AT) {
      setCompleted(true);
      persist(v.currentTime, true);
    } else {
      persist(v.currentTime, completed);
    }
  };

  const onEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    setCompleted(true);
    persist(v.currentTime || 0, true);
  };

  const markComplete = () => {
    const v = videoRef.current;
    const pos = v?.currentTime ?? 0;
    setCompleted(true);
    persist(pos, true);
  };

  // Save position on unload too
  useEffect(() => {
    const handler = () => {
      const v = videoRef.current;
      if (v && v.currentTime > 0) persist(v.currentTime, completed);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [persist, completed]);

  // Keyboard navigation: ← prev, → next
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea or when video is focused for seeking
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "VIDEO") return;
      if (e.key === "ArrowLeft" && prevHref) {
        e.preventDefault();
        router.push(prevHref);
      } else if (e.key === "ArrowRight" && nextHref) {
        e.preventDefault();
        router.push(nextHref);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevHref, nextHref, router]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-2.5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-200"
        >
          <ChevronLeft className="h-3 w-3" />
          back to course
        </Link>
        <div className="flex items-center gap-3">
          {positionLabel && (
            <span className="font-mono text-[10px] text-zinc-500">
              {positionLabel}
            </span>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "exit fullscreen" : "fullscreen"}
            aria-label={isFullscreen ? "exit fullscreen" : "fullscreen"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            {isFullscreen ? (
              <Minimize className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <Maximize className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {isFullscreen ? "exit" : "fullscreen"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 px-6 py-6">
          <div
            ref={wrapperRef}
            className="relative overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-white/10"
          >
            {loading && (
              <div className="flex aspect-video w-full items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                loading video…
              </div>
            )}
            {error && (
              <div className="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-rose-300">
                {error}
              </div>
            )}
            {src && !loading && (
              <>
                <video
                  ref={videoRef}
                  src={src}
                  controls
                  controlsList="nodownload nofullscreen"
                  onContextMenu={(e) => e.preventDefault()}
                  preload="metadata"
                  onTimeUpdate={onTimeUpdate}
                  onEnded={onEnded}
                  className="block aspect-video w-full"
                />
                <VideoWatermark />
                {/* Exit button lives INSIDE the wrapper so it's reachable while
                    the wrapper is the fullscreen element (the chrome-bar button
                    isn't part of the fullscreen subtree). Escape also works. */}
                {isFullscreen && (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title="exit fullscreen"
                    aria-label="exit fullscreen"
                    className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 text-white/90 ring-1 ring-white/15 backdrop-blur transition hover:bg-black/80 hover:text-white"
                  >
                    <Minimize className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {completed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  completed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={markComplete}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  mark as complete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {prevHref ? (
                <Link
                  href={prevHref}
                  title={prevTitle ?? "previous lesson"}
                  className="group inline-flex max-w-[220px] items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                      previous
                    </span>
                    {prevTitle && (
                      <span className="max-w-[180px] truncate">{prevTitle}</span>
                    )}
                  </span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 bg-zinc-900/30 px-3 py-1.5 text-xs text-zinc-600">
                  <ChevronLeft className="h-3.5 w-3.5" /> first lesson
                </span>
              )}
              {nextHref ? (
                <Link
                  href={nextHref}
                  title={nextTitle ?? "next lesson"}
                  className="inline-flex max-w-[260px] items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
                >
                  <span className="flex min-w-0 flex-col items-end leading-tight">
                    <span className="text-[9px] uppercase tracking-wider text-white/80">
                      up next
                    </span>
                    {nextTitle && (
                      <span className="max-w-[200px] truncate">{nextTitle}</span>
                    )}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/5 bg-zinc-900/30 px-3 py-1.5 text-xs text-zinc-600">
                  last lesson <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
