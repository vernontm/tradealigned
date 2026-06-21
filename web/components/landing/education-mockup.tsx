"use client";

/**
 * Static visual of the Education library, module strip + thumbnail grid that
 * mirrors the real /education page. Hand-tuned course names and durations so
 * it reads like a real screenshot without any data fetch.
 */
import { GraduationCap, PlayCircle } from "lucide-react";

type Lesson = {
  title: string;
  duration: string;
  hue: number;
};

const LESSONS: Lesson[] = [
  { title: "The Three Phases Of Candlestick Formation", duration: "08:21", hue: 152 },
  { title: "Drawing And Trading Supply Demand Zones", duration: "11:14", hue: 200 },
  { title: "Understanding Wicks As Retracements", duration: "06:47", hue: 280 },
  { title: "Liquidity Sweeps Before Continuation", duration: "09:33", hue: 30 },
  { title: "Higher Timeframe Bias In 4 Steps", duration: "10:02", hue: 110 },
  { title: "Order Block Retest Mechanics", duration: "07:55", hue: 340 },
];

const MODULES = [
  { name: "Beginners", count: 17, active: false },
  { name: "Intermediate", count: 17, active: false },
  { name: "Advanced", count: 26, active: true },
  { name: "888 Inner Market Mastery", count: 8, active: false },
  { name: "Psychology", count: 1, active: false },
];

export function EducationMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl ring-1 ring-white/5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-zinc-900/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500/60" />
            <span className="h-2 w-2 rounded-full bg-amber-500/60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            <GraduationCap className="h-3 w-3" strokeWidth={2.5} />
            Education
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
          included with free account
        </span>
      </div>

      {/* Module strip */}
      <div className="flex gap-1.5 border-b border-white/5 bg-zinc-900/40 px-3 py-2 overflow-x-auto">
        {MODULES.map((m) => (
          <button
            key={m.name}
            disabled
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap transition ${
              m.active
                ? "bg-gradient-to-br from-emerald-500/25 to-teal-500/15 text-emerald-200 ring-1 ring-emerald-400/40"
                : "bg-white/5 text-zinc-400 ring-1 ring-white/5"
            }`}
          >
            {m.name}
            <span
              className={`rounded-full px-1.5 text-[8px] ${
                m.active
                  ? "bg-emerald-500/30 text-emerald-200"
                  : "bg-zinc-700/50 text-zinc-400"
              }`}
            >
              {m.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lesson grid */}
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((l, i) => (
          <div
            key={l.title}
            className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50"
          >
            <div className="relative aspect-video w-full">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, hsla(${l.hue},70%,30%,0.7), hsla(${(l.hue + 40) % 360},70%,15%,0.9))`,
                }}
              />
              {/* Fake chart silhouette */}
              <svg
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full opacity-50"
              >
                <path
                  d="M0 80 L20 65 L40 75 L60 55 L80 60 L100 40 L120 45 L140 25 L160 35 L180 20 L200 30"
                  fill="none"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1.5}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow">
                  <PlayCircle className="h-4 w-4" strokeWidth={2} />
                </div>
              </div>
              <div className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white">
                {l.duration}
              </div>
              <div className="absolute left-1.5 top-1.5 rounded-md bg-zinc-900/70 px-1.5 py-0.5 text-[8px] font-mono text-zinc-300 ring-1 ring-white/10">
                #{i + 1}
              </div>
            </div>
            <div className="p-2.5">
              <div className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-100">
                {l.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
