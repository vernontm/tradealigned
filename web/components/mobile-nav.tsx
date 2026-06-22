"use client";

import {
  ExternalLink,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";
import { useCurrentUser } from "@/lib/use-current-user";
import { CreditsBadge } from "@/components/credits-badge";

export function MobileNav() {
  const pathname = usePathname();
  const { email, role } = useCurrentUser();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + handle escape while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="open menu"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 md:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-zinc-950 px-3 py-4 text-zinc-200 shadow-2xl">
            <div className="flex items-start justify-between px-2 pb-3">
              <Link href="/" onClick={() => setOpen(false)}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  TGFX Academy
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                  <div className="text-base font-semibold text-white">
                    Trade Aligned
                  </div>
                </div>
              </Link>
              <button
                type="button"
                aria-label="close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {NAV.map((item) => {
                const active =
                  !item.external &&
                  (pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href)));
                const Icon = item.icon;
                const cls = `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-zinc-900/60 text-zinc-100 shadow"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`;
                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 font-medium">{item.label}</span>
                      <ExternalLink
                        className="h-3 w-3 shrink-0 text-zinc-600"
                        strokeWidth={1.75}
                      />
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} className={cls}>
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1 font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {role === "admin" && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                    pathname.startsWith("/admin")
                      ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-200 ring-1 ring-amber-400/30"
                      : "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 font-medium">Admin</span>
                </Link>
              )}
            </nav>

            {email && (
              <div className="mt-2">
                <CreditsBadge />
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              <Link
                href="/account"
                className="flex flex-1 items-center gap-3 rounded-xl bg-white/5 px-3 py-3 transition hover:bg-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                  {(email ?? "R").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {email ? email.split("@")[0] : "student"}
                  </div>
                  <div className="truncate text-[11px] text-zinc-500">
                    {role === "admin"
                      ? "admin"
                      : email
                      ? "signed in"
                      : "not signed in"}
                  </div>
                </div>
              </Link>
              {email ? (
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    title="sign out"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </form>
              ) : (
                <Link
                  href="/sign-in"
                  className="inline-flex h-9 items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 text-xs font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
                >
                  sign in
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
