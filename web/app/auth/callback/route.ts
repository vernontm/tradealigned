import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

/**
 * Magic-link landing page. Supabase appends a `code` query param when the
 * user clicks the link in their email; we exchange it for a session cookie
 * and bounce to the next destination (or /chat).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/chat";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${url.origin}/sign-in?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
