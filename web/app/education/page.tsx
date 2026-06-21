import { BookOpen, Check, GraduationCap, PlayCircle } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAllCourseModules, getLessonProgressFor } from "@/lib/courses";

function fmtHours(sec: number): string {
  if (!sec || sec < 60) return ", ";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default async function Page() {
  const modules = await getAllCourseModules();
  const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progress = await getLessonProgressFor(allLessonIds);

  return (
    <AppShell title="Education" subtitle="watch the TGFX course library">
      <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              TGFX Academy · course library
            </div>
            <h2 className="mt-1 text-2xl font-bold text-zinc-100">
              study every module Ray teaches.
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons
              across {modules.length} module
              {modules.length === 1 ? "" : "s"}. stream from your account.
            </p>
          </div>

          {modules.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">
              <BookOpen
                className="mx-auto mb-2 h-8 w-8 text-zinc-700"
                strokeWidth={1.5}
              />
              no courses yet, the mirror script will populate this once the S3
              bucket is wired up.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const total = m.lessons.length;
              const done = m.lessons.filter((l) =>
                progress.completedIds.has(l.id)
              ).length;
              const started = m.lessons.filter((l) =>
                progress.inProgressIds.has(l.id)
              ).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const complete = total > 0 && done === total;
              return (
                <Link
                  key={m.slug}
                  href={`/education/${m.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-emerald-400/40"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-cyan-500/10">
                    {m.lessons[0]?.signed_thumb_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.lessons[0].signed_thumb_url}
                        alt={m.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <GraduationCap
                          className="h-12 w-12 text-emerald-300/40"
                          strokeWidth={1.5}
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
                    {complete && (
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-400/50 backdrop-blur">
                        <Check className="h-3 w-3" strokeWidth={3} />
                        complete
                      </div>
                    )}
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-zinc-950/80 px-2 py-1 text-[10px] font-semibold text-zinc-100 ring-1 ring-white/10 backdrop-blur">
                      <PlayCircle className="h-3 w-3" strokeWidth={2} />
                      {total} lesson
                      {total === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-zinc-100">
                      {m.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">
                        {fmtHours(m.total_duration_sec)}
                        {started > 0 && !complete && (
                          <span className="ml-2 text-amber-300/80">
                            · {started} in progress
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-mono ${
                          complete ? "text-emerald-300" : "text-zinc-400"
                        }`}
                      >
                        {done}/{total} · {pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
