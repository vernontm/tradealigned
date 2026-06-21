"use client";

import {
  Crown,
  Loader2,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  app_user_id: string;
  auth_user_id: string | null;
  email: string;
  role: "user" | "admin";
  tier: string;
  email_verified: boolean;
  stripe_customer_id: string | null;
  current_period_ends_at: string | null;
  app_created_at: string;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
};

// Only three tiers are user-facing now: Free, Trial, Paid. The dropdown
// writes one of these three values when an admin changes a tier.
//
// Legacy Stripe-issued tier values (live_trade_lab, lifetime) still exist on
// older rows and inside the Stripe webhook code path, we don't lose data on
// them, we just display them as "Paid" and let an admin re-save to normalize.
const TIERS = ["free", "trial", "paid_standard"];

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  trial: "Trial",
  paid_standard: "Paid",
  // Legacy values fold into "Paid" for display so existing rows keep working.
  live_trade_lab: "Paid",
  lifetime: "Paid",
};

const TIER_TONE: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-200",
  trial: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40",
  paid_standard: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40",
  // Same tone as paid_standard so legacy values render consistently.
  live_trade_lab: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40",
  lifetime: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40",
};

const fmtDate = (s: string | null) => {
  if (!s) return ", ";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "2-digit",
      month: "short",
      day: "numeric",
    });
  } catch {
    return ", ";
  }
};

export function AdminView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      const r = await fetch(`/api/admin/users?${p.toString()}`);
      const j = await r.json();
      if (!r.ok || j.error) {
        setError(j.error || `status ${r.status}`);
        return;
      }
      setUsers(j.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const patch = async (
    appUserId: string,
    body: { role?: "user" | "admin"; tier?: string }
  ) => {
    setSavingId(appUserId);
    setError(null);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app_user_id: appUserId, ...body }),
      });
      const j = await r.json();
      if (!r.ok || j.error) {
        setError(j.error || `status ${r.status}`);
        return;
      }
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) =>
          u.app_user_id === appUserId ? { ...u, ...body } : u
        )
      );
    } finally {
      setSavingId(null);
    }
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const paidCount = users.filter((u) =>
    ["paid_standard", "live_trade_lab", "lifetime"].includes(u.tier)
  ).length;
  const verifiedCount = users.filter((u) => u.email_verified).length;

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              admin · user management
            </div>
            <h2 className="mt-1 text-2xl font-bold text-zinc-100">
              everyone in the room
            </h2>
            <p className="text-sm text-zinc-400">
              promote or demote admins, swap subscription tiers, see who&apos;s
              actually signed in.
            </p>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Kpi label="users" value={users.length.toString()} sub="signed up" />
          <Kpi
            label="admins"
            value={adminCount.toString()}
            sub="full access"
            tone="emerald"
          />
          <Kpi
            label="paid"
            value={paidCount.toString()}
            sub="active subs"
            tone="sky"
          />
          <Kpi
            label="verified"
            value={verifiedCount.toString()}
            sub="email confirmed"
            tone="amber"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search by email…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          {loading && (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-zinc-500"
              strokeWidth={2}
            />
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-zinc-900/60 ring-1 ring-white/10">
          <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <div className="col-span-4">user</div>
            <div className="col-span-2">role</div>
            <div className="col-span-3">tier</div>
            <div className="col-span-1">verified</div>
            <div className="col-span-1">last seen</div>
            <div className="col-span-1">joined</div>
          </div>
          {users.length === 0 && !loading && (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              no users yet, sign-ups will appear here.
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.app_user_id}
              className="grid grid-cols-12 items-center gap-3 border-b border-white/5 px-5 py-3 text-sm last:border-b-0"
            >
              <div className="col-span-4 flex min-w-0 items-center gap-2.5">
                <div
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                    u.role === "admin"
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  }`}
                >
                  {u.role === "admin" ? (
                    <Crown className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <User className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-zinc-100">{u.email}</div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {u.auth_user_id?.slice(0, 8) ?? ", "}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <select
                  value={u.role}
                  onChange={(e) =>
                    patch(u.app_user_id, {
                      role: e.target.value as "user" | "admin",
                    })
                  }
                  disabled={savingId === u.app_user_id}
                  className={`w-full cursor-pointer rounded-lg border border-white/10 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-400 ${
                    u.role === "admin"
                      ? "text-amber-300"
                      : "text-zinc-200"
                  }`}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="col-span-3 flex items-center gap-1.5">
                <select
                  value={u.tier}
                  onChange={(e) =>
                    patch(u.app_user_id, { tier: e.target.value })
                  }
                  disabled={savingId === u.app_user_id}
                  className={`flex-1 cursor-pointer rounded-lg border border-white/10 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-400`}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                    TIER_TONE[u.tier] ?? "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {TIER_LABEL[u.tier] ?? u.tier}
                </span>
              </div>

              <div className="col-span-1">
                {u.email_verified ? (
                  <ShieldCheck
                    className="h-4 w-4 text-emerald-300"
                    strokeWidth={2}
                  />
                ) : (
                  <span className="text-[11px] text-zinc-600">no</span>
                )}
              </div>

              <div className="col-span-1 text-[11px] text-zinc-500">
                {fmtDate(u.last_sign_in_at)}
              </div>

              <div className="col-span-1 text-[11px] text-zinc-500">
                {fmtDate(u.auth_created_at ?? u.app_created_at)}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] text-zinc-500">
          changes save instantly via PATCH /api/admin/users. all actions require
          the caller to be flagged role=admin in app_users.
        </div>
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
  tone?: "emerald" | "sky" | "amber";
}) {
  const accent =
    tone === "emerald"
      ? "from-emerald-500 to-teal-600"
      : tone === "sky"
      ? "from-sky-500 to-indigo-600"
      : tone === "amber"
      ? "from-amber-500 to-orange-600"
      : "from-zinc-500 to-zinc-700";
  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow`}
        >
          <User className="h-4 w-4" strokeWidth={2} />
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
