"use client";

import { Check, Coins, Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

const RAY_AI_FEATURES = [
  "3,000 credits every month",
  "unlimited library + gems access",
  "full daily drill arcade",
  "chat + chart roasts with Ray AI",
  "all future features included",
  "cancel anytime",
];

const TOPUPS = [
  {
    id: "topup_2k",
    label: "2,000 credits",
    price: "$9.99",
    blurb: "great for a focused review week.",
    perCredit: "0.5¢ / credit",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    id: "topup_5k",
    label: "5,000 credits",
    price: "$19.99",
    blurb: "best value. study like you mean it.",
    perCredit: "0.4¢ / credit · save 20%",
    accent: "from-amber-500 to-orange-500",
    highlighted: true,
  },
] as const;

export function PricingView() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (plan: string) => {
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("enter your email so we can tie this purchase to your account.");
      return;
    }
    setBusy(plan);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, email: email.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) {
        setError(j.error || "couldn't start checkout");
        setBusy(null);
        return;
      }
      window.location.assign(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <div className="relative px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow shadow-emerald-500/30">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              ray ai · plans
            </div>
            <h2 className="text-3xl font-bold text-zinc-100">
              train alongside Ray, on every chart.
            </h2>
            <p className="mx-auto max-w-xl text-sm text-zinc-400">
              one subscription powers chat, chart roasts, and the drill arcade.
              top up anytime if you run hot.
            </p>
          </div>

          {/* Email gate */}
          <div className="mx-auto max-w-md space-y-1.5">
            <div className="rounded-2xl bg-white/5 p-4 shadow-sm ring-1 ring-white/10 backdrop-blur">
              <label className="block text-xs font-semibold text-zinc-300">
                your email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none placeholder-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </label>
            </div>
            <p className="px-2 text-center text-[10px] text-zinc-500">
              auto-filled from your account once you&apos;re logged in.
            </p>
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-center text-xs text-rose-300">
                {error}
              </div>
            )}
          </div>

          {/* Two-column: subscription | top-ups */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* LEFT, Ray AI subscription, dark hero card */}
            <div className="relative">
              <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-7 text-white shadow-xl ring-1 ring-zinc-800">
                <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl" />

                <div className="relative space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/40">
                      <Sparkles className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                      most popular
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      subscription
                    </div>
                    <h3 className="mt-0.5 text-2xl font-bold">Ray AI</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      the mentor agent, on demand.
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="bg-gradient-to-br from-emerald-300 to-teal-400 bg-clip-text text-5xl font-bold text-transparent">
                      $29.99
                    </span>
                    <span className="text-sm font-medium text-zinc-500">
                      / month
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-sm">
                    {RAY_AI_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-zinc-300">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                          <Check
                            className="h-3 w-3 text-emerald-400"
                            strokeWidth={3}
                          />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => checkout("ray_ai")}
                    disabled={busy !== null}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-60"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {busy === "ray_ai" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          redirecting…
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" strokeWidth={2.5} />
                          get Ray AI
                        </>
                      )}
                    </span>
                  </button>

                  <div className="rounded-xl bg-white/5 p-3 text-[11px] text-zinc-400 ring-1 ring-white/10">
                    💡 <span className="font-semibold text-white">tip:</span>{" "}
                    credits power chat (5 cr), chart roasts (15 cr), and quiz
                    questions (3 cr).
                  </div>

                  <div className="text-center text-[10px] text-zinc-500">
                    cancel anytime · billed monthly · test mode
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT, Credit top-ups */}
            <div className="relative">
              <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-7 text-white shadow-xl ring-1 ring-zinc-800">
                <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />

                <div className="relative space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/40">
                      <Coins className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                      one-time top-ups
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                      credit packs
                    </div>
                    <h3 className="mt-0.5 text-2xl font-bold">
                      ran out of credits?
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      top up any time. these never expire.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {TOPUPS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => checkout(t.id)}
                        disabled={busy !== null}
                        className={`group relative w-full overflow-hidden rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-white/20 disabled:opacity-60 ${
                          t.highlighted ? "ring-amber-400/50" : ""
                        }`}
                      >
                        {t.highlighted && (
                          <span className="absolute -right-1 -top-1 rounded-bl-xl rounded-tr-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                            best value
                          </span>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={`bg-gradient-to-br ${t.accent} bg-clip-text text-xl font-bold text-transparent`}
                            >
                              {t.label}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-zinc-400">
                              {t.blurb}
                            </div>
                            <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-amber-300/80">
                              {t.perCredit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{t.price}</div>
                            <div className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold transition group-hover:bg-white/20">
                              {busy === t.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Zap className="h-2.5 w-2.5" strokeWidth={3} />
                                  buy now
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 text-center text-[11px] text-zinc-400">
            payments by Stripe · all plans in test mode · manage billing from
            your account
          </div>
        </div>
      </div>
    </div>
  );
}
