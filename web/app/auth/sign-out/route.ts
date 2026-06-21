import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
