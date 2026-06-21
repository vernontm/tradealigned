import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/pricing",
];

const ADMIN_PATHS = ["/admin"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAdmin(pathname: string) {
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  // Auth not configured yet — let everything through. This lets Ray finish
  // wiring up the .env keys without 500-ing the entire app in the meantime.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh + read the current user. This is critical: without this call, the
  // session cookie won't refresh and the user will get bounced after expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  if (isPublic(path)) return res;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isAdmin(path)) {
    const { data: appUser } = await supabase
      .from("app_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (appUser?.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/chat";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  // Skip static files + the api routes that handle their own auth.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|media/|.*\\..*).*)",
  ],
};
