"use client";

import { Check, Copy, Crown, Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getProfile, onProfileChange, type Profile } from "@/lib/profile";
import { getAllAttempts, MODE_META, statsForMode } from "@/lib/progress";

type Student = {
  handle: string;
  display_name?: string;
  discord?: string;
  city: string;
  accuracy: number; // 0..100
  drills: number;
  streak: number;
  bestMode: string;
  joined: string; // ISO date
  avatarHue: number; // 0..360 for gradient
  isYou?: boolean;
};

// Demo students removed pending cross-user sync. The leaderboard now renders
// only the local user's row (if profile is set) so the page no longer ships
// fabricated handles like "@taylor_fx" / "@eu_sniper". When auth + per-user
// stats are wired, populate STUDENTS from the server.
const STUDENTS: Student[] = [];

/** Build the local user's Student row from their profile + drill stats. */
function buildYouRow(profile: Profile): Student | null {
  if (!profile.discord_handle.trim() && !profile.display_name.trim()) {
    return null;
  }
  const attempts = getAllAttempts();
  let bestAcc = 0;
  let bestMode: keyof typeof MODE_META = "quiz";
  let totalDrills = 0;
  let bestStreak = 0;
  for (const k of Object.keys(MODE_META) as (keyof typeof MODE_META)[]) {
    const s = statsForMode(attempts, k);
    totalDrills += s.total;
    if (s.bestStreak > bestStreak) bestStreak = s.bestStreak;
    if (s.total >= 3 && s.accuracy > bestAcc) {
      bestAcc = s.accuracy;
      bestMode = k;
    }
  }
  const overallAcc = (() => {
    const positive = attempts.filter((a) =>
      ["correct", "win"].includes(a.outcome)
    ).length;
    const negative = attempts.filter((a) =>
      ["incorrect", "loss", "timeout"].includes(a.outcome)
    ).length;
    const denom = positive + negative;
    return denom === 0 ? 0 : Math.round((positive / denom) * 100);
  })();
  const name =
    profile.display_name ||
    profile.discord_handle.replace(/^@/, "") ||
    "you";
  return {
    handle: `@${profile.discord_handle.replace(/^@/, "") || name}`,
    display_name: profile.display_name || undefined,
    discord: profile.discord_handle || undefined,
    city: profile.city || ", ",
    accuracy: overallAcc,
    drills: totalDrills,
    streak: bestStreak,
    bestMode: MODE_META[bestMode].label,
    joined: new Date().toISOString().slice(0, 10),
    avatarHue: profile.avatar_hue,
    isYou: true,
  };
}

function rankedAvg(students: Student[]) {
  const totals = students.reduce(
    (acc, s) => ({ a: acc.a + s.accuracy, d: acc.d + s.drills }),
    { a: 0, d: 0 }
  );
  return {
    avgAccuracy: Math.round(totals.a / Math.max(1, students.length)),
    totalDrills: totals.d,
  };
}

export function CommunityView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    setProfile(getProfile());
    return onProfileChange(() => setProfile(getProfile()));
  }, []);

  const all = useMemo(() => {
    const you = profile ? buildYouRow(profile) : null;
    return you ? [you, ...STUDENTS] : STUDENTS;
  }, [profile]);

  const ranked = useMemo(
    () => [...all].sort((a, b) => b.accuracy - a.accuracy),
    [all]
  );
  const { avgAccuracy, totalDrills } = rankedAvg(all);

  const hasYou = ranked.some((s) => s.isYou);

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              community board
            </div>
            <h2 className="mt-1 text-2xl font-bold text-zinc-100">
              how the room is doing
            </h2>
            <p className="text-sm text-zinc-400">
              the leaderboard updates as students train. all numbers are real
              drill stats, no shortcuts, no fake streaks.
            </p>
          </div>
          <a
            href="https://discord.gg/VxeDYRysXp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-3.5 py-2 text-xs font-semibold text-white shadow shadow-[#5865F2]/30 transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Join the Discord
          </a>
        </div>

        {/* CTA, link Discord */}
        {!hasYou && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="text-xs">
              <span className="font-semibold text-emerald-200">
                add your Discord
              </span>{" "}
              <span className="text-emerald-300/80">
                so other students can find you on the board.
              </span>
            </div>
            <Link
              href="/account"
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
            >
              link Discord
            </Link>
          </div>
        )}

        {ranked.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center">
            <Trophy className="mx-auto h-8 w-8 text-emerald-300" strokeWidth={1.5} />
            <h3 className="mt-3 text-base font-semibold text-zinc-100">
              the leaderboard is just getting started
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-zinc-500">
              run a few drills and link your Discord from{" "}
              <Link href="/account" className="text-emerald-300 underline-offset-2 hover:underline">
                your account
              </Link>{" "}
              to claim a spot on the board. once more students join, this
              page fills out with live stats.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi
                label="room avg accuracy"
                value={`${avgAccuracy}%`}
                sub="across all drill modes"
                tone="emerald"
              />
              <Kpi
                label="drills this week"
                value={totalDrills.toLocaleString()}
                sub="combined"
                tone="sky"
              />
              <Kpi
                label="top streak"
                value={`${Math.max(...ranked.map((s) => s.streak))} 🔥`}
                sub={ranked[0].handle}
                tone="rose"
              />
            </div>

            {ranked.length >= 3 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {ranked.slice(0, 3).map((s, i) => (
                  <PodiumCard key={s.handle} student={s} rank={i + 1} />
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10">
              <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <div className="col-span-1">#</div>
                <div className="col-span-3">student</div>
                <div className="col-span-3">Discord</div>
                <div className="col-span-1">acc</div>
                <div className="col-span-1">drills</div>
                <div className="col-span-1">streak</div>
                <div className="col-span-2">strongest</div>
              </div>
              {ranked.map((s, i) => (
                <Row key={s.handle} student={s} rank={i + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "sky" | "rose";
}) {
  const iconBg = {
    emerald: "from-emerald-500 to-teal-600",
    sky: "from-sky-500 to-indigo-600",
    rose: "from-rose-500 to-pink-600",
  }[tone];
  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${iconBg} text-white shadow`}
        >
          <Trophy className="h-4 w-4" strokeWidth={2} />
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

function Avatar({ student, size = 32 }: { student: Student; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${student.avatarHue} 80% 55%), hsl(${(student.avatarHue + 40) % 360} 80% 40%))`,
      }}
    >
      {student.handle.replace(/^@/, "").slice(0, 2).toUpperCase()}
    </div>
  );
}

function PodiumCard({ student, rank }: { student: Student; rank: number }) {
  const accent =
    rank === 1
      ? "from-amber-500 to-orange-600"
      : rank === 2
      ? "from-zinc-300 to-zinc-500"
      : "from-amber-700 to-amber-900";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-white/10">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-15 blur-3xl`}
      />
      <div className="relative flex items-center gap-3">
        <Avatar student={student} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
            {student.handle}
            {rank === 1 && (
              <Crown className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.5} />
            )}
          </div>
          <div className="text-[11px] text-zinc-500">{student.city}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-zinc-100">
            {student.accuracy}%
          </div>
          <div className="text-[10px] text-zinc-500">
            {student.drills} drills
          </div>
        </div>
      </div>
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full bg-gradient-to-r ${accent}`}
          style={{ width: `${student.accuracy}%` }}
        />
      </div>
    </div>
  );
}

function Row({ student, rank }: { student: Student; rank: number }) {
  return (
    <div
      className={`grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-3 text-sm last:border-b-0 transition ${
        student.isYou
          ? "bg-emerald-500/10 ring-1 ring-emerald-400/30"
          : "hover:bg-white/[0.02]"
      }`}
    >
      <div className="col-span-1 text-xs font-bold text-zinc-500">#{rank}</div>
      <div className="col-span-3 flex items-center gap-2.5">
        <Avatar student={student} size={28} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-zinc-100">
              {student.display_name || student.handle}
            </span>
            {student.isYou && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                you
              </span>
            )}
          </div>
          <div className="text-[10px] text-zinc-500">{student.city}</div>
        </div>
      </div>
      <div className="col-span-3">
        <DiscordCell discord={student.discord} />
      </div>
      <div className="col-span-1 font-semibold text-emerald-300">
        {student.accuracy}%
      </div>
      <div className="col-span-1 text-zinc-300">{student.drills}</div>
      <div className="col-span-1 flex items-center gap-1 text-zinc-300">
        <Flame className="h-3 w-3 text-rose-400" strokeWidth={2} />
        {student.streak}
      </div>
      <div className="col-span-2 truncate text-[11px] text-zinc-500">
        {student.bestMode}
      </div>
    </div>
  );
}

function DiscordCell({ discord }: { discord?: string }) {
  const [copied, setCopied] = useState(false);
  if (!discord) {
    return <span className="text-[11px] text-zinc-600">, </span>;
  }
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(discord);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex w-full items-center gap-1.5 truncate rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-1 text-left text-[11px] text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
      title={`copy @${discord}`}
    >
      <DiscordIcon className="h-3 w-3 shrink-0 text-zinc-500 group-hover:text-emerald-300" />
      <span className="truncate font-mono">@{discord}</span>
      {copied ? (
        <Check
          className="ml-auto h-3 w-3 shrink-0 text-emerald-300"
          strokeWidth={2.5}
        />
      ) : (
        <Copy
          className="ml-auto h-3 w-3 shrink-0 text-zinc-600 group-hover:text-emerald-300"
          strokeWidth={2}
        />
      )}
    </button>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.27 5.33A18.5 18.5 0 0 0 14.6 4l-.21.46c1.7.45 2.5 1.13 3.34 1.95a14.46 14.46 0 0 0-11.46 0c.84-.82 1.82-1.55 3.34-1.95L9.4 4a17.5 17.5 0 0 0-4.67 1.33C1.86 9.64 1.08 13.85 1.47 18a18.78 18.78 0 0 0 5.84 2.95l1.19-1.6a11.27 11.27 0 0 1-1.85-.9c.16-.11.31-.23.46-.34a13.27 13.27 0 0 0 11.78 0c.15.11.3.23.46.34a11.5 11.5 0 0 1-1.86.9l1.19 1.6A18.78 18.78 0 0 0 22.53 18c.46-4.85-.78-9.02-3.26-12.67ZM8.52 15.33c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.96-2.4 2.15-2.4 1.2 0 2.16 1.07 2.15 2.4 0 1.32-.96 2.4-2.15 2.4Zm6.97 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.96-2.4 2.15-2.4 1.2 0 2.16 1.07 2.15 2.4 0 1.32-.96 2.4-2.15 2.4Z" />
    </svg>
  );
}
