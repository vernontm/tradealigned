"use client";

/**
 * Wrap a page/view to lock it behind the $1 trial for free-tier accounts.
 *
 * Free accounts see the children rendered (blurred + non-interactive) behind
 * a glassy paywall card. Trial/paid/admin users see the children normally.
 *
 * Server-side enforcement of credit-burning APIs (chat, drills) still needs
 * to land, this component is the UX layer.
 */

import { Loader2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useHasPaidAccess } from "@/lib/use-current-user";

type TierGateProps = {
  /** Short feature name shown in the paywall header, e.g. "Mentor Chat". */
  feature: string;
  /** One-line pitch shown under the feature name. */
  pitch: string;
  children: React.ReactNode;
};

export function TierGate({ feature, pitch, children }: TierGateProps) {
  const hasAccess = useHasPaidAccess();

  // While auth is loading, show a quiet loader so we don't flash the
  // paywall to a paid user during hydration.
  if (hasAccess === undefined) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        loading…
      </div>
    );
  }

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      {/* Underlying page, blurred + frozen */}
      <div
        aria-hidden
        className="pointer-events-none h-full min-h-0 select-none"
        style={{ filter: "blur(10px) saturate(0.85)" }}
      >
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-md">
        <div className="relative mx-4 w-full max-w-md">
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-emerald-400/40 via-teal-500/40 to-cyan-500/40 blur" />
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-zinc-950/95 p-7 shadow-2xl ring-1 ring-white/5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-500/15 blur-3xl" />

            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/40">
                  <Lock className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  upgrade required
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {feature} is part of the $1 trial.
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {pitch}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-200">$1 for 7 days</span>
                {" "}of full access — Trade AI, Library, Gems, Drill Arcade,
                progress tracking. then $29.99/mo unless you cancel.
              </div>
              <Link
                href="/billing"
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  upgrade to unlock
                </span>
              </Link>
              <div className="text-center">
                <Link
                  href="/education"
                  className="text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  ← back to the free course library
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
