import { Crosshair, Gauge, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const MODES = [
  {
    href: "/drill/quiz",
    label: "Setup Quiz",
    desc: "would you take this trade? identify the setup. discrimination training.",
    icon: Sparkles,
    status: "live" as const,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    href: "/drill/replay",
    label: "Replay / Predict",
    desc: "see the entry chart, call up or down, then watch how it played out.",
    icon: PlayCircle,
    status: "live" as const,
    accent: "from-sky-500 to-indigo-600",
  },
  {
    href: "/drill/sniper",
    label: "Sniper Mode",
    desc: "trade a live candle replay. enter long or short, set your stop, target +10 pips. don't get stopped out.",
    icon: Crosshair,
    status: "live" as const,
    accent: "from-rose-500 to-pink-600",
  },
  {
    href: "/drill/speed",
    label: "Speed Read",
    desc: "5-second flash, name the pattern. trains your eye for live trading.",
    icon: Gauge,
    status: "live" as const,
    accent: "from-violet-500 to-fuchsia-600",
  },
];

export default function Page() {
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
                every mode pulls from Ray&apos;s real trade corpus. no fake setups,
                no toy examples. you train on what actually traded.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isLive = m.status === "live";
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
                    {!isLive && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                        soon
                      </span>
                    )}
                    {isLive && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                        live
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
        </div>
      </div>
    </AppShell>
  );
}
