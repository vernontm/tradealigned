"use client";

import { Crosshair, Gauge, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CREDIT_COSTS, type CreditAction } from "@/lib/credit-costs";
import { useCurrentUser } from "@/lib/use-current-user";

type Mode = {
  href: string;
  label: string;
  desc: string;
  icon: typeof Sparkles;
  status: "live" | "soon";
  accent: string;
  costAction: CreditAction;
  adminOnly?: boolean;
};

// All modes open to every authenticated account; Setup Quiz is admin-only
// for now because the question pool is still being curated.
const MODES: Mode[] = [
  {
    href: "/drill/quiz",
    label: "Setup Quiz",
    desc: "would you take this trade? identify the setup. discrimination training.",
    icon: Sparkles,
    status: "live",
    accent: "from-emerald-500 to-teal-600",
    costAction: "drill_question",
    adminOnly: true,
  },
  {
    href: "/drill/replay",
    label: "Replay / Predict",
    desc: "see the entry chart, call up or down, then watch how it played out.",
    icon: PlayCircle,
    status: "live",
    accent: "from-sky-500 to-indigo-600",
    costAction: "drill_replay",
  },
  {
    href: "/drill/sniper",
    label: "Sniper Mode",
    desc: "trade a live candle replay. enter long or short, set your stop, target +10 pips. don't get stopped out.",
    icon: Crosshair,
    status: "live",
    accent: "from-rose-500 to-pink-600",
    costAction: "drill_sniper",
  },
  {
    href: "/drill/speed",
    label: "Speed Read",
    desc: "5-second flash, name the pattern. trains your eye for live trading.",
    icon: Gauge,
    status: "live",
    accent: "from-violet-500 to-fuchsia-600",
    costAction: "drill_speed",
  },
];

export default function Page() {
  const { actualRole } = useCurrentUser();
  const isAdmin = actualRole === "admin";
  const visibleModes = MODES.filter((m) => !m.adminOnly || isAdmin);

  return (
    <AppShell title="Daily Drill" subtitle="train your eye, sharpen your reads">
      <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                pick your drill
              </div>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                games that make you a sharper trader
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                every mode pulls from real trade history. no fake setups,
                no toy examples. you train on what actually traded.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleModes.map((m) => {
              const Icon = m.icon;
              const isLive = m.status === "live";
              const cost = CREDIT_COSTS[m.costAction];

              const inner = (
                <div
                  className={`group relative h-full overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-zinc-200 transition ${
                    isLive
                      ? "cursor-pointer shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                      : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.accent} text-white shadow`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-base font-semibold text-zinc-900">
                      {m.label}
                    </div>
                    {m.adminOnly && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                        admin
                      </span>
                    )}
                    {isLive && !m.adminOnly && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                        {cost} credits
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {m.desc}
                  </p>
                </div>
              );

              return isLive ? (
                <Link key={m.href} href={m.href}>
                  {inner}
                </Link>
              ) : (
                <div key={m.href}>{inner}</div>
              );
            })}
          </div>

          {!isAdmin && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-center text-xs text-zinc-500">
              All drill modes are open. Setup Quiz is being curated and will
              roll out once the question pool is fully reviewed.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
