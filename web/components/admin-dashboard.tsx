"use client";

import {
  Loader2,
  MessageSquare,
  Search,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type Kpis = {
  total_students: number;
  new_24h: number;
  new_7d: number;
  active_subscribers: number;
  total_lessons: number;
  chat_messages: number;
  drills_played: number;
  ad_clicks: number;
};

type Student = {
  id: string;
  email: string;
  tier: string;
  role: string;
  joined_at: string;
  logins: number;
  last_active: string;
  chat_count: number;
  drills_played: number;
  gem_views: number;
  searches: number;
  ad_clicks: number;
  lessons_completed: number;
  credit_balance: number;
};

type StatsResponse = {
  generated_at: string;
  kpis: Kpis;
  students: Student[];
};

const POLL_MS = 20_000;

type ActivityEvent = {
  type: "chat" | "search";
  metadata: {
    query?: string;
    response?: string;
    scope?: string;
    has_image?: boolean;
  } | null;
  created_at: string;
};

export function AdminDashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Expanded student row → their recent chat queries + searches.
  const [openId, setOpenId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const toggleRow = useCallback(
    async (id: string) => {
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      setActivity(null);
      setActivityLoading(true);
      try {
        const r = await fetch(`/api/admin/student-activity?user_id=${id}`, {
          cache: "no-store",
        });
        const j = await r.json();
        setActivity((j.events as ActivityEvent[]) ?? []);
      } catch {
        setActivity([]);
      } finally {
        setActivityLoading(false);
      }
    },
    [openId]
  );

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!r.ok) {
        setError(`failed to load (${r.status})`);
        return;
      }
      setData((await r.json()) as StatsResponse);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Initial load + poll for near-real-time registrations/activity.
  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  if (!data && !error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        loading dashboard…
      </div>
    );
  }

  const kpis = data?.kpis;
  const students = (data?.students ?? []).filter((s) =>
    q.trim() ? s.email.toLowerCase().includes(q.trim().toLowerCase()) : true
  );
  const totalLessons = kpis?.total_lessons || 1;

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* KPI grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icon={Users}
            label="total students"
            value={kpis?.total_students ?? 0}
            sub={`${kpis?.active_subscribers ?? 0} paid`}
            tone="emerald"
          />
          <Kpi
            icon={UserPlus}
            label="new today"
            value={kpis?.new_24h ?? 0}
            sub={`${kpis?.new_7d ?? 0} in 7 days`}
            tone="sky"
            live
          />
          <Kpi
            icon={MessageSquare}
            label="chat messages"
            value={kpis?.chat_messages ?? 0}
            sub="all-time"
            tone="violet"
          />
          <Kpi
            icon={Target}
            label="drills played"
            value={kpis?.drills_played ?? 0}
            sub={`${kpis?.ad_clicks ?? 0} ad clicks`}
            tone="amber"
          />
        </div>

        {/* Student table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-100">
              students ({students.length})
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">
                {data
                  ? `updated ${new Date(data.generated_at).toLocaleTimeString()}`
                  : ""}
              </span>
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 py-1">
                <Search className="h-3 w-3 text-zinc-500" strokeWidth={2} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="search email…"
                  className="w-40 bg-transparent text-xs text-zinc-200 outline-none placeholder-zinc-600"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 font-semibold">student</th>
                  <th className="px-3 py-2.5 font-semibold">tier</th>
                  <th className="px-3 py-2.5 font-semibold">joined</th>
                  <th className="px-3 py-2.5 font-semibold">last active</th>
                  <th className="px-3 py-2.5 text-right font-semibold">logins</th>
                  <th className="px-3 py-2.5 text-right font-semibold">course</th>
                  <th className="px-3 py-2.5 text-right font-semibold">chat</th>
                  <th className="px-3 py-2.5 text-right font-semibold">drills</th>
                  <th className="px-3 py-2.5 text-right font-semibold">gems</th>
                  <th className="px-3 py-2.5 text-right font-semibold">search</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ad</th>
                  <th className="px-3 py-2.5 text-right font-semibold">credits</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <Fragment key={s.id}>
                    <tr
                      onClick={() => toggleRow(s.id)}
                      className={`cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03] ${
                        openId === s.id ? "bg-white/[0.04]" : ""
                      }`}
                      title="click to see chat queries + searches"
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-zinc-100">
                          {s.email}
                        </span>
                        {s.role === "admin" && (
                          <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <TierPill tier={s.tier} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {fmtDate(s.joined_at)}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {fmtRelative(s.last_active)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.logins}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.lessons_completed}/{totalLessons}
                        <span className="ml-1 text-[10px] text-zinc-500">
                          (
                          {Math.round(
                            (s.lessons_completed / totalLessons) * 100
                          )}
                          %)
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.chat_count}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.drills_played}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.gem_views}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.searches}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.ad_clicks}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {s.credit_balance}
                      </td>
                    </tr>
                    {openId === s.id && (
                      <tr className="border-b border-white/5 bg-zinc-950/40">
                        <td colSpan={12} className="px-4 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                            recent chat queries + searches
                          </div>
                          {activityLoading ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              loading…
                            </div>
                          ) : activity && activity.length > 0 ? (
                            <ul className="mt-2 space-y-1.5">
                              {activity.map((e, i) => (
                                <li key={i} className="text-xs">
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                        e.type === "chat"
                                          ? "bg-violet-500/15 text-violet-300"
                                          : "bg-sky-500/15 text-sky-300"
                                      }`}
                                    >
                                      {e.type === "chat"
                                        ? "asked"
                                        : e.metadata?.scope || "search"}
                                    </span>
                                    <span className="flex-1 font-medium text-zinc-200">
                                      {e.metadata?.query || "—"}
                                      {e.metadata?.has_image && (
                                        <span className="ml-1 text-[10px] text-zinc-500">
                                          📎 chart
                                        </span>
                                      )}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-zinc-600">
                                      {fmtRelative(e.created_at)}
                                    </span>
                                  </div>
                                  {e.type === "chat" && e.metadata?.response && (
                                    <div className="ml-[3.25rem] mt-1 border-l-2 border-emerald-400/30 pl-2.5 text-[11px] leading-relaxed text-zinc-400">
                                      <span className="text-[9px] font-bold uppercase text-emerald-400/70">
                                        Trade AI:{" "}
                                      </span>
                                      {e.metadata.response.length > 600
                                        ? e.metadata.response.slice(0, 600) + "…"
                                        : e.metadata.response}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-2 text-xs text-zinc-600">
                              no chat queries or searches logged yet.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      no students match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  live,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub: string;
  tone: "emerald" | "sky" | "violet" | "amber";
  live?: boolean;
}) {
  const ring = {
    emerald: "ring-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    sky: "ring-sky-400/30 bg-sky-500/10 text-sky-300",
    violet: "ring-violet-400/30 bg-violet-500/10 text-violet-300",
    amber: "ring-amber-400/30 bg-amber-500/10 text-amber-300",
  }[tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${ring}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        {live && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      <div className="text-[10px] text-zinc-500">{sub}</div>
    </div>
  );
}

function TierPill({ tier }: { tier: string }) {
  const paid = tier && tier !== "free";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        paid
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
          : "bg-white/5 text-zinc-400 ring-1 ring-white/10"
      }`}
    >
      {tier || "free"}
    </span>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  } catch {
    return "—";
  }
}
