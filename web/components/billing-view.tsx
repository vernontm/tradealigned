"use client";

import { CreditCard, ExternalLink, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function BillingView() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("enter the email you used at checkout.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) {
        setError(j.error || "couldn't open billing portal");
        setBusy(false);
        return;
      }
      window.location.assign(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-5">
          {/* Header */}
          <div className="space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow shadow-emerald-500/30">
              <CreditCard className="h-3 w-3" strokeWidth={2.5} />
              billing
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">
              manage your subscription
            </h2>
            <p className="text-sm text-zinc-400">
              open the secure Stripe portal to update payment method, cancel,
              download invoices, or upgrade.
            </p>
          </div>

          {/* Portal card */}
          <div className="relative">
            <div className="flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 text-white shadow-xl ring-1 ring-zinc-800">
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />

              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/40">
                    <CreditCard className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      Stripe Customer Portal
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      hosted by Stripe · secure
                    </div>
                  </div>
                </div>

                <label className="block text-xs font-semibold text-zinc-300">
                  your email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="the one you used at checkout"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />
                </label>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative inline-flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        opening…
                      </>
                    ) : (
                      <>
                        open billing portal
                        <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                      </>
                    )}
                  </span>
                </button>

                <div className="rounded-xl bg-white/5 p-3 text-[11px] text-zinc-400 ring-1 ring-white/10">
                  💡 you can change card, swap plans, view invoices, and cancel
                  from the portal. changes apply immediately.
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/pricing"
              className="group flex items-center justify-between rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-white/10 transition hover:ring-emerald-400/40"
            >
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  upgrade or top up
                </div>
                <div className="text-xs text-zinc-500">
                  pricing plans + credit packs
                </div>
              </div>
              <ShoppingBag
                className="h-5 w-5 text-zinc-500 transition group-hover:text-emerald-400"
                strokeWidth={2}
              />
            </Link>
            <Link
              href="/progress"
              className="group flex items-center justify-between rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-white/10 transition hover:ring-emerald-400/40"
            >
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  see usage
                </div>
                <div className="text-xs text-zinc-500">
                  drills, credits, accuracy
                </div>
              </div>
              <CreditCard
                className="h-5 w-5 text-zinc-500 transition group-hover:text-emerald-400"
                strokeWidth={2}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
