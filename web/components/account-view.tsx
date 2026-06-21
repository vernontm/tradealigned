"use client";

import {
  Check,
  Copy,
  Dices,
  ExternalLink,
  Loader2,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  cleanDiscordHandle,
  EMPTY_PROFILE,
  getProfile,
  onProfileChange,
  saveProfile,
  type Profile,
} from "@/lib/profile";

export function AccountView() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setHydrated(true);
    return onProfileChange(() => setProfile(getProfile()));
  }, []);

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    saveProfile({
      ...profile,
      discord_handle: cleanDiscordHandle(profile.discord_handle),
      display_name: profile.display_name.trim(),
      city: profile.city.trim(),
      bio: profile.bio.trim(),
    });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  };

  const reroll = () =>
    update("avatar_hue", Math.floor(Math.random() * 360));

  const initials = (profile.display_name || profile.discord_handle || "you")
    .replace(/^@/, "")
    .slice(0, 2)
    .toUpperCase();

  const openBillingPortal = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });
      const j = await r.json();
      if (r.ok && j.url) {
        window.location.assign(j.url);
        return;
      }
      // Fall back to the billing page if no Stripe customer yet
      window.location.assign("/billing");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        loading…
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Header */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            account
          </div>
          <h2 className="mt-1 text-2xl font-bold text-zinc-100">
            your profile
          </h2>
          <p className="text-sm text-zinc-400">
            add a display name and your Discord so other TGFX students can find
            you on the community board.
          </p>
        </div>

        {/* Profile card */}
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl bg-zinc-900/60 p-5 shadow-sm ring-1 ring-white/10"
        >
          {/* Identity row */}
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow ring-2 ring-white/10"
              style={{
                background: `linear-gradient(135deg, hsl(${profile.avatar_hue} 80% 55%), hsl(${(profile.avatar_hue + 40) % 360} 80% 40%))`,
              }}
            >
              {initials}
              <button
                type="button"
                onClick={reroll}
                className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-white/10 text-zinc-300 transition hover:text-emerald-300 hover:ring-emerald-400/40"
                title="reroll avatar color"
              >
                <Dices className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-zinc-100">
                {profile.display_name || "unnamed student"}
              </div>
              <div className="text-xs text-zinc-500">
                {profile.discord_handle
                  ? `@${profile.discord_handle}`
                  : "no Discord linked yet"}
              </div>
              {profile.city && (
                <div className="text-[11px] text-zinc-500">{profile.city}</div>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="display name">
              <input
                type="text"
                value={profile.display_name}
                onChange={(e) => update("display_name", e.target.value)}
                placeholder="how Ray should call you"
                maxLength={40}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </Field>

            <Field
              label="Discord handle"
              hint="just the username, students can DM you on Discord."
            >
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/60 pl-3 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20">
                <DiscordIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="text-sm text-zinc-500">@</span>
                <input
                  type="text"
                  value={profile.discord_handle.replace(/^@/, "")}
                  onChange={(e) => update("discord_handle", e.target.value)}
                  placeholder="taylor_fx"
                  maxLength={64}
                  className="flex-1 bg-transparent py-2 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none"
                />
              </div>
            </Field>

            <Field label="city">
              <input
                type="text"
                value={profile.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Houston, TX"
                maxLength={48}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </Field>

            <Field label="bio" hint="optional, one line about your trading.">
              <input
                type="text"
                value={profile.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="e.g. EURUSD scalper, asia session"
                maxLength={120}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-500">
              saved locally. once auth lands, this syncs to your TGFX account
              and appears on the community board automatically.
            </p>
            <div className="flex items-center gap-2">
              {savedAt && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  saved
                </span>
              )}
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
              >
                save profile
              </button>
            </div>
          </div>
        </form>

        {/* Subscription card */}
        <div className="overflow-hidden rounded-2xl bg-zinc-900/60 p-5 shadow-sm ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                subscription
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">
                Ray AI · $29.99 / month
              </div>
              <div className="text-[11px] text-zinc-500">
                manage card, swap plans, view invoices.
              </div>
            </div>
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  opening…
                </>
              ) : (
                <>
                  open billing portal
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Discord deep-link helper */}
        {profile.discord_handle && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-200">
                <DiscordIcon className="h-3.5 w-3.5 text-emerald-300" />
                <span>your Discord:</span>
                <strong>@{cleanDiscordHandle(profile.discord_handle)}</strong>
              </div>
              <CopyButton
                value={cleanDiscordHandle(profile.discord_handle)}
                tone="emerald"
              />
            </div>
            <div className="mt-1 text-[11px] text-emerald-300/80">
              students see this on the community board and can DM you directly.
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-rose-300">
                wipe local data
              </div>
              <div className="text-[11px] text-rose-200/70">
                clears your profile, credits, and drill progress on this
                browser. doesn&apos;t cancel your subscription.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!confirm("clear local profile + progress + credits?"))
                  return;
                window.localStorage.removeItem("ray-ai-profile.v1");
                window.localStorage.removeItem("ray-ai-progress.v1");
                window.localStorage.removeItem("ray-ai-credits.v1");
                window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              wipe
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" strokeWidth={2} />
            <span>locally stored profile · syncs when you sign in</span>
          </div>
          <Link
            href="/community"
            className="text-emerald-300 hover:text-emerald-200"
          >
            see the community board →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      {children}
      {hint && <div className="text-[10px] text-zinc-600">{hint}</div>}
    </label>
  );
}

function CopyButton({
  value,
  tone = "zinc",
}: {
  value: string;
  tone?: "zinc" | "emerald";
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  const accent =
    tone === "emerald"
      ? "border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/20"
      : "border-white/10 text-zinc-300 hover:bg-white/10";
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${accent}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" strokeWidth={2.5} />
          copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" strokeWidth={2} />
          copy
        </>
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
