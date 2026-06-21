"use client";

import { Bell, Coins, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBalance, onCreditsChange } from "@/lib/credits";
import { MobileNav } from "./mobile-nav";
import { ViewAsToggle } from "./view-as-toggle";

export function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    setBalance(getBalance());
    return onCreditsChange(() => setBalance(getBalance()));
  }, []);

  const low = balance !== null && balance < 30;

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 px-3 shadow-xl ring-1 ring-zinc-800 sm:px-5">
      <div className="pointer-events-none absolute -right-16 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative flex min-w-0 items-center gap-2">
        <MobileNav />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">
            {title}
          </div>
          {subtitle && (
            <div className="hidden truncate text-[11px] text-zinc-500 sm:block">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ViewAsToggle />
        <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 lg:flex">
          <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>search trades, concepts…</span>
        </div>
        <Link
          href="/pricing"
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-white shadow transition hover:brightness-110 sm:px-3 ${
            low
              ? "bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/30"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30"
          }`}
          title="manage credits"
        >
          <Coins className="h-3.5 w-3.5" strokeWidth={2} />
          <span>{balance === null ? ", " : balance.toLocaleString()}</span>
          <span className="hidden sm:inline">credits</span>
        </Link>
        <button
          aria-label="notifications"
          className="hidden rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 sm:inline-flex"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="hidden h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 ring-2 ring-zinc-900 sm:block" />
      </div>
    </header>
  );
}
