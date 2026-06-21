"use client";

/**
 * Lightweight hook for "who is signed in and what's their role?".
 * Used to gate admin-only UI (e.g. inline trade-outcome curation, the Admin
 * link in the sidebar). Returns nulls until the first auth roundtrip lands so
 * callers should treat `loaded === false` as "don't show admin chrome yet".
 *
 * The role is read from `public.app_users.role`, joined on `auth_user_id`.
 *
 * The "view as student" toggle (see lib/view-as.ts) downgrades the effective
 * role to "user" while preserving the real role on `actualRole`, that way the
 * UI hides admin chrome but the toggle control itself can still render.
 */

import { useEffect, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-browser";
import { getViewAs, onViewAsChange, type ViewAs } from "@/lib/view-as";

export type Role = "user" | "admin";

/**
 * Tier values that exist in app_users.tier. `paid_standard` is the canonical
 * paid tier; `live_trade_lab` and `lifetime` are legacy Stripe-issued tiers
 * that should still count as paid for access purposes.
 */
export type Tier =
  | "free"
  | "trial"
  | "paid_standard"
  | "live_trade_lab"
  | "lifetime";

const PAID_TIERS = new Set<Tier>([
  "trial",
  "paid_standard",
  "live_trade_lab",
  "lifetime",
]);

export type CurrentUser = {
  email: string | null;
  role: Role | null;       // effective role, respects view-as toggle
  actualRole: Role | null; // true role from the database
  tier: Tier | null;
  viewAs: ViewAs;
  loaded: boolean;
};

export function useCurrentUser(): CurrentUser {
  const [actualRole, setActualRole] = useState<Role | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [viewAs, setViewAs] = useState<ViewAs>("admin");

  // Initial load + subscribe to view-as changes.
  useEffect(() => {
    setViewAs(getViewAs());
    const off = onViewAsChange(() => setViewAs(getViewAs()));
    return off;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoaded(true);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const sb = getSupabaseBrowser();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) {
          if (alive) setLoaded(true);
          return;
        }
        const { data: row } = await sb
          .from("app_users")
          .select("role, tier")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (alive) {
          setEmail(user.email ?? null);
          setActualRole((row?.role as Role | null) ?? "user");
          setTier((row?.tier as Tier | null) ?? "free");
          setLoaded(true);
        }
      } catch {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Effective role: admin in student view becomes "user" everywhere except
  // the toggle itself, which checks `actualRole`.
  const effective: Role | null =
    actualRole === "admin" && viewAs === "student" ? "user" : actualRole;

  return {
    email,
    role: effective,
    actualRole,
    tier,
    viewAs,
    loaded: loaded || !isSupabaseConfigured(),
  };
}

export function useIsAdmin(): boolean {
  const { role } = useCurrentUser();
  return role === "admin";
}

// Use this in the toggle control itself so the button still renders even
// when an admin is currently impersonating a student.
export function useActualIsAdmin(): boolean {
  const { actualRole } = useCurrentUser();
  return actualRole === "admin";
}

/**
 * Has the user paid (or are they on trial)? Admins are always granted access
 * regardless of tier so they can use the app without a Stripe subscription , 
 * if an admin wants to preview what a free student sees, the view-as toggle
 * downgrades `role` to "user" but tier stays whatever it actually is.
 *
 * Returns `undefined` until the auth roundtrip completes, callers should
 * treat that as "don't gate yet" so we don't flash a paywall during load.
 */
export function useHasPaidAccess(): boolean | undefined {
  const { role, tier, loaded } = useCurrentUser();
  if (!loaded) return undefined;
  // Real admins always have access. View-as-student downgrades role so an
  // admin can preview the paywall by toggling view-as.
  if (role === "admin") return true;
  if (!tier) return false;
  // Pre-existing rows from before this refactor default to "free" so the
  // explicit set is the source of truth for who counts as paying.
  return PAID_TIERS.has(tier);
}
