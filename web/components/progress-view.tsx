"use client";

import {
  Activity,
  ExternalLink,
  Eye,
  Flame,
  GraduationCap,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getTouches as getCourseTouches,
  onTouchesChange as onCourseTouchesChange,
  refreshTitles as refreshCourseTitles,
  type Touch as CourseTouch,
} from "@/lib/course-touch";
import {
  clearAllAttempts,
  dailyBuckets,
  getAllAttempts,
  MODE_META,
  onProgressChange,
  overallStats,
  statsForMode,
  type Attempt,
  type DrillMode,
} from "@/lib/progress";

const MODE_ORDER: DrillMode[] = ["quiz", "replay", "sniper", "speed"];
const MODE_HREF: Record<DrillMode, string> = {
  quiz: "/drill/quiz",
  replay: "/drill/replay",
  sniper: "/drill/sniper",
  speed: "/drill/speed",
};

export function ProgressView() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [touches, setTouches] = useState<CourseTouch[]>([]);
  const [totalLessons, setTotalLessons] = useState<number | null>(null);

  useEffect(() => {
    setAttempts(getAllAttempts());
    setTouches(getCourseTouches());
    setHydrated(true);
    const off1 = onProgressChange(() => setAttempts(getAllAttempts()));
    const off2 = onCourseTouchesChange(() => setTouches(getCourseTouches()));
    void fetch("/api/courses/stats")
      .then((r) => r.json())
      .then((j) => setTotalLessons(j?.total_lessons ?? null))
      .catch(() => setTotalLessons(null));
    // Upgrade any stale localStorage titles (raw filenames seeded before the
    // AI display_name backfill) to the current display_name.
    void refreshCourseTitles().then(() => setTouches(getCourseTouches()));
    return () => {
      off1();
      off2();
    };
  }, []);

  const overall = useMemo(() => overallStats(attempts), [attempts]);
  const perMode = useMemo(
    () => MODE_ORDER.map((m) => statsForMode(attempts, m)),
    [attempts]
  );
  const buckets = useMemo(() => dailyBuckets(attempts, 14), [attempts]);
  const last7Total = buckets.slice(-7).reduce((acc, b) => acc + b.total, 0);
  const last7Positive = buckets.slice(-7).reduce((acc, b) => acc + b.positive, 0);
  const last7Acc = last7Total === 0 ? 0 : Math.round((last7Positive / last7Total) * 100);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.total));

  const weakest = useMemo(() => {
    const tried = perMode.filter((m) => m.total >= 3 && m.positive + m.negative > 0);
    if (tried.length === 0) return null;
    return tried.reduce((min, m) => (m.accuracy < min.accuracy ? m : min));
  }, [perMode]);

  const strongest = useMemo(() => {
    const tried = perMode.filter((m) => m.total >= 3 && m.positive + m.negative > 0);
    if (tried.length === 0) return null;
    return tried.reduce((max, m) => (m.accuracy > max.accuracy ? m : max));
  }, [perMode]);

  const untried = useMemo(
    () => perMode.filter((m) => m.total === 0),
    [perMode]
  );

  const reset = () => {
    if (confirm("clear all drill progress? this can't be undone.")) {
      clearAllAttempts();
    }
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        loading your progress…
      </div>
    );
  }

  if (overall.total === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
            <Trophy className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">no drills run yet</h2>
          <p className="text-sm text-zinc-400">
            play any drill and your accuracy, streaks, and weak spots will start
            showing up here. let&apos;s see what you&apos;re working with.
          </p>
          <Link
            href="/drill"
            className="inline-flex rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
          >
            pick a drill →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* OVERALL strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            icon={<Activity className="h-4 w-4" strokeWidth={2} />}
            label="overall accuracy"
            value={`${overall.accuracy}%`}
            sub={`${overall.positive} of ${overall.positive + overall.negative} judged calls`}
            tone="emerald"
          />
          <KpiTile
            icon={<Target className="h-4 w-4" strokeWidth={2} />}
            label="total drills"
            value={String(overall.total)}
            sub="across every mode"
            tone="sky"
          />
          <KpiTile
            icon={<Flame className="h-4 w-4" strokeWidth={2} />}
            label="last 7 days"
            value={String(last7Total)}
            sub={`${last7Acc}% accurate`}
            tone="rose"
          />
          <KpiTile
            icon={<Trophy className="h-4 w-4" strokeWidth={2} />}
            label="best streak"
            value={String(
              perMode.reduce((m, s) => Math.max(m, s.bestStreak), 0)
            )}
            sub="across modes"
            tone="amber"
          />
        </div>

        {/* 14-day activity */}
        <div className="rounded-2xl bg-zinc-900/60 p-5 shadow-sm ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-100">
                last 14 days
              </div>
              <div className="text-[11px] text-zinc-500">
                green = positive · gray = total
              </div>
            </div>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {buckets.map((b, i) => {
              const h = (b.total / maxBucket) * 100;
              const pos = b.total > 0 ? (b.positive / b.total) * h : 0;
              const date = new Date(b.dayStart);
              return (
                <div
                  key={i}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                >
                  <div className="relative w-full overflow-hidden rounded-md bg-white/10">
                    <div
                      className="w-full bg-zinc-200"
                      style={{ height: `${h}%`, minHeight: b.total > 0 ? 2 : 0 }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-teal-400"
                      style={{ height: `${pos}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-zinc-400">
                    {date.toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </div>
                  <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] text-white group-hover:block">
                    {b.total} drills · {b.positive} right
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course knowledge */}
        <CourseKnowledge touches={touches} totalLessons={totalLessons} />

        {/* Per-mode cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perMode.map((s) => (
            <ModeCard key={s.mode} stats={s} />
          ))}
        </div>

        {/* Insights */}
        {(weakest || strongest || untried.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-3">
            {strongest && (
              <InsightTile
                label="strongest"
                title={MODE_META[strongest.mode].label}
                value={`${strongest.accuracy}%`}
                tone="emerald"
                href={MODE_HREF[strongest.mode]}
                cta="defend the streak"
              />
            )}
            {weakest && weakest.mode !== strongest?.mode && (
              <InsightTile
                label="biggest leak"
                title={MODE_META[weakest.mode].label}
                value={`${weakest.accuracy}%`}
                tone="rose"
                href={MODE_HREF[weakest.mode]}
                cta="drill it now"
              />
            )}
            {untried.length > 0 && (
              <InsightTile
                label="haven't tried"
                title={`${untried.length} mode${untried.length === 1 ? "" : "s"}`}
                value={untried
                  .slice(0, 2)
                  .map((u) => MODE_META[u.mode].label)
                  .join(", ")}
                tone="sky"
                href={MODE_HREF[untried[0].mode]}
                cta="try it"
                small
              />
            )}
          </div>
        )}

        {/* Reset */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-[11px] text-zinc-500 transition hover:border-rose-400/60 hover:bg-rose-500/15 hover:text-rose-400"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2} />
            reset all progress
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseKnowledge({
  touches,
  totalLessons,
}: {
  touches: CourseTouch[];
  totalLessons: number | null;
}) {
  const engaged = touches.length;
  const openedFull = touches.filter((t) => t.opened_full).length;
  const denom = totalLessons && totalLessons > 0 ? totalLessons : engaged;
  const pct =
    denom > 0 ? Math.min(100, Math.round((engaged / denom) * 100)) : 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 p-5 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow">
            <GraduationCap className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              course knowledge
            </div>
            <div className="text-[11px] text-zinc-500">
              {totalLessons === null
                ? "lessons Ray AI has surfaced for you"
                : `${engaged} of ${totalLessons} TGFX lessons explored · ${openedFull} watched in full`}
            </div>
          </div>
        </div>
        <span className="font-mono text-xs text-violet-300">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {touches.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-[11px] text-zinc-500">
          ask Ray a concept question in{" "}
          <Link
            href="/chat"
            className="font-semibold text-violet-300 hover:text-violet-200"
          >
            Mentor Chat
          </Link>{" "}
         , every lesson he cites lands here, with a link to the exact timestamp.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {touches.slice(0, 6).map((t) => (
            <li
              key={t.video_id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2 ring-1 ring-white/5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  {t.opened_full ? (
                    <span
                      title="watched in full"
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30"
                    >
                      <ExternalLink
                        className="h-2.5 w-2.5 text-emerald-300"
                        strokeWidth={2.5}
                      />
                    </span>
                  ) : (
                    <span
                      title="cited in chat"
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-400/30"
                    >
                      <Eye
                        className="h-2.5 w-2.5 text-violet-300"
                        strokeWidth={2.5}
                      />
                    </span>
                  )}
                  <span className="truncate text-zinc-200">{t.title}</span>
                </div>
                <div className="ml-6 text-[10px] text-zinc-500">
                  {t.touches} cite{t.touches === 1 ? "" : "s"} ·{" "}
                  {new Date(t.last_touched_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </li>
          ))}
          {touches.length > 6 && (
            <li className="px-3 text-[10px] text-zinc-500">
              + {touches.length - 6} more lessons explored
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "sky" | "rose" | "amber";
}) {
  const iconBg = {
    emerald: "from-emerald-500 to-teal-600",
    sky: "from-sky-500 to-indigo-600",
    rose: "from-rose-500 to-pink-600",
    amber: "from-amber-500 to-orange-600",
  }[tone];
  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${iconBg} text-white shadow`}>
          {icon}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold text-zinc-100">{value}</div>
      <div className="text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}

function ModeCard({
  stats,
}: {
  stats: ReturnType<typeof statsForMode>;
}) {
  const meta = MODE_META[stats.mode];
  const tried = stats.total > 0;
  return (
    <Link
      href={MODE_HREF[stats.mode]}
      className="block rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{meta.label}</div>
          <div className="text-[11px] text-zinc-500">
            {tried ? `${stats.total} attempts` : "no attempts yet"}
          </div>
        </div>
        <div
          className={`rounded-lg bg-gradient-to-br ${meta.accent} px-2.5 py-1 text-xs font-bold text-white shadow`}
        >
          {tried ? `${stats.accuracy}%` : ", "}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full bg-gradient-to-r ${meta.accent}`}
          style={{ width: `${stats.accuracy}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>
          {stats.positive} right · {stats.negative} wrong
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3 w-3" strokeWidth={2} />
          {stats.bestStreak} streak
        </span>
      </div>
    </Link>
  );
}

function InsightTile({
  label,
  title,
  value,
  tone,
  href,
  cta,
  small,
}: {
  label: string;
  title: string;
  value: string;
  tone: "emerald" | "rose" | "sky";
  href: string;
  cta: string;
  small?: boolean;
}) {
  const bg = {
    emerald: "border-emerald-500/30 bg-emerald-500/15",
    rose: "border-rose-500/30 bg-rose-50/40",
    sky: "border-sky-200/70 bg-sky-50/40",
  }[tone];
  const accent = {
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    sky: "text-sky-300",
  }[tone];
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${bg}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${accent}`}>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{title}</div>
      <div className={`mt-0.5 ${small ? "text-[11px] text-zinc-400" : "text-lg font-bold text-zinc-100"}`}>
        {value}
      </div>
      <Link href={href} className={`mt-2 inline-block text-[11px] font-semibold ${accent} hover:underline`}>
        {cta} →
      </Link>
    </div>
  );
}
