import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Auth-aware Supabase client for server components, route handlers, and
 * server actions. Uses the public anon key (RLS applies) and the user's
 * session cookie for identification.
 */
export function isAuthConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, cookies are read-only there.
            // Middleware handles refresh, so this is safe to swallow.
          }
        },
      },
    }
  );
}

/** Get the current logged-in Supabase user (or null). */
export async function getCurrentUser() {
  if (!isAuthConfigured()) return null;
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

/**
 * Returns the app_users row for the current user. `role` is the *effective*
 * role, admins viewing the app as a student (via the view-as cookie) come
 * back as role='user' so every admin gate downgrades them automatically.
 *
 * `actualRole` preserves the real DB value so the toggle UI itself can check
 * it. The toggle endpoint and /admin gate use `actualRole === 'admin'` so an
 * admin can always get back out of student view.
 */
export async function getCurrentAppUser() {
  if (!isAuthConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const sb = await createSupabaseServer();

  let { data } = await sb
    .from("app_users")
    .select("id, email, role, tier, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // First touch: a Supabase Auth user exists but has no internal app_users
  // row yet (happens when someone signs up via the standard form and hasn't
  // gone through Stripe checkout, which is the other place rows get
  // created). Auto-insert with default tier='free' so every authenticated
  // user is queryable by app id from here forward. This is what unblocked
  // chat + drills returning 401 even for signed-in accounts.
  if (!data && user.email) {
    const { supabase: serviceClient } = await import("./supabase");
    const ins = await serviceClient
      .from("app_users")
      .insert({
        email: user.email,
        auth_user_id: user.id,
        tier: "free",
      })
      .select("id, email, role, tier, auth_user_id")
      .single();
    if (ins.data) data = ins.data;
  }

  if (!data) return null;
  const { getViewAsCookie } = await import("./view-as-server");
  const viewAs = await getViewAsCookie();
  const actualRole = data.role as "user" | "admin";
  const effectiveRole =
    actualRole === "admin" && viewAs === "student" ? "user" : actualRole;
  return { ...data, role: effectiveRole, actualRole };
}
