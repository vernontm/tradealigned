import {
  Check,
  ChevronLeft,
  Clock,
  GraduationCap,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCourseModule, getLessonProgressFor } from "@/lib/courses";

function fmtTime(sec: number | null): string {
  if (!sec || sec < 1) return ", ";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function Page({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const mod = await getCourseModule(slug);
  if (!mod) notFound();

  const progress = await getLessonProgressFor(mod.lessons.map((l) => l.id));
  const total = mod.lessons.length;
  const done = mod.lessons.filter((l) =>
    progress.completedIds.has(l.id)
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <AppShell title={mod.title} subtitle="watch + track your progress">
      <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <Link
            href="/education"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"
          >
            <ChevronLeft className="h-3 w-3" /> back to course library
          </Link>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-100">{mod.title}</h2>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>
                {total} lesson{total === 1 ? "" : "s"}
              </span>
              <span>·</span>
              <span>{fmtTime(mod.total_duration_sec)}</span>
              <span>·</span>
              <span
                className={`font-mono ${
                  done === total && total > 0
                    ? "text-emerald-300"
                    : "text-zinc-300"
                }`}
              >
                {done}/{total} complete · {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {mod.lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">
              no lessons yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mod.lessons.map((l, i) => {
                const isDone = progress.completedIds.has(l.id);
                const isInProgress =
                  !isDone && progress.inProgressIds.has(l.id);
                const pos = progress.positionByLesson.get(l.id) ?? 0;
                const partialPct =
                  isInProgress && l.duration_sec && l.duration_sec > 0
                    ? Math.min(100, Math.round((pos / l.duration_sec) * 100))
                    : 0;
                return (
                  <Link
                    key={l.id}
                    href={`/education/${slug}/${l.id}`}
                    className={`group relative overflow-hidden rounded-2xl bg-zinc-900/60 ring-1 transition hover:-translate-y-0.5 ${
                      isDone
                        ? "ring-emerald-400/40 hover:ring-emerald-400/70"
                        : "ring-white/10 hover:ring-emerald-400/40"
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-cyan-500/10">
                      {l.signed_thumb_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.signed_thumb_url}
                          alt={l.display_name ?? "lesson"}
                          loading="lazy"
                          className={`absolute inset-0 h-full w-full object-cover transition group-hover:scale-105 ${
                            isDone ? "" : ""
                          }`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <GraduationCap
                            className="h-10 w-10 text-emerald-300/40"
                            strokeWidth={1.5}
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />

                      {isDone && (
                        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-400/50 backdrop-blur">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          done
                        </div>
                      )}
                      {isInProgress && (
                        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100 ring-1 ring-amber-400/40 backdrop-blur">
                          <PlayCircle className="h-2.5 w-2.5" strokeWidth={2.5} />
                          in progress
                        </div>
                      )}

                      <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/80 px-2 py-0.5 font-mono text-[10px] text-zinc-200 ring-1 ring-white/10 backdrop-blur">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/80 px-2 py-0.5 font-mono text-[10px] text-zinc-200 ring-1 ring-white/10 backdrop-blur">
                        <Clock className="h-2.5 w-2.5" strokeWidth={2} />
                        {fmtTime(l.duration_sec)}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                        <PlayCircle
                          className="h-14 w-14 text-white drop-shadow-lg"
                          strokeWidth={1.5}
                        />
                      </div>

                      {/* Watch progress bar at very bottom */}
                      {(isInProgress || isDone) && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                          <div
                            className={`h-full ${
                              isDone
                                ? "bg-emerald-400"
                                : "bg-gradient-to-r from-amber-400 to-amber-300"
                            }`}
                            style={{
                              width: isDone ? "100%" : `${partialPct}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3
                        className={`line-clamp-2 text-sm font-semibold ${
                          isDone ? "text-zinc-300" : "text-zinc-100"
                        }`}
                      >
                        {l.display_name}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
