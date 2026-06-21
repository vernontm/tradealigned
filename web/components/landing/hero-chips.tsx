"use client";

/**
 * Floating glassy chip-cards sitting in the negative space around the hero,
 * modelled on the VoltX reference. Each chip has an icon dot, a one-line
 * label, a short subtitle, and a corner arrow. Absolute-positioned with a
 * gentle floating animation so they feel alive without distracting.
 *
 * Hidden on small screens, they only make sense once there's room to breathe.
 */

import { ArrowUpRight, type LucideIcon, MessageSquare, PlayCircle, Sparkles } from "lucide-react";

type Chip = {
  icon: LucideIcon;
  title: string;
  sub: string;
  className: string;
  delay: string;
  hue: string; // tailwind color for the icon dot
};

// Chips are positioned relative to the inner content column (max-w-7xl), so
// `left-0` / `right-0` hugs the column's edges, not the viewport. The side
// flag lives outside this column on the viewport edge so they stay clear.
const CHIPS: Chip[] = [
  {
    icon: Sparkles,
    title: "Trained on Ray's actual sessions",
    sub: "115+ hours analyzed, transcribed, indexed",
    className: "absolute left-0 top-4 max-w-[240px]",
    delay: "0s",
    hue: "emerald",
  },
  {
    icon: MessageSquare,
    title: "Every answer cites a real moment",
    sub: "with the timestamp and the clip",
    className: "absolute right-0 top-24 max-w-[220px]",
    delay: "1.4s",
    hue: "teal",
  },
  {
    icon: PlayCircle,
    title: "Practice on his real charts",
    sub: "the drill arcade, always evolving",
    className: "absolute left-4 bottom-32 max-w-[220px]",
    delay: "2.8s",
    hue: "fuchsia",
  },
];

const RING: Record<string, string> = {
  emerald: "ring-emerald-400/30",
  teal: "ring-teal-400/30",
  fuchsia: "ring-fuchsia-400/30",
};

const BG: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300",
  teal: "bg-teal-500/15 text-teal-300",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-300",
};

export function HeroChips() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden lg:block"
      style={{ zIndex: 3 }}
    >
      {CHIPS.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`${c.className} rounded-2xl border border-white/10 bg-zinc-950/70 px-3.5 py-2.5 shadow-xl ring-1 ring-white/5 backdrop-blur-md`}
            style={{
              animation: `ray-chip-float 6s ease-in-out ${c.delay} infinite`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${RING[c.hue]} ${BG[c.hue]}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold leading-tight text-zinc-100">
                  {c.title}
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">
                  {c.sub}
                </div>
              </div>
              <ArrowUpRight
                className="mt-0.5 h-3 w-3 text-zinc-500"
                strokeWidth={2.5}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes ray-chip-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
