/**
 * GET /api/lessons/[id]/page-redirect?at=234
 *
 * Resolves a lesson video's owning course module and 302-redirects to the
 * in-app Education player at /education/<module-slug>/<video_id>?t=<sec>.
 * The lesson player reads `?t=` and seeks the video on load.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAllCourseModules } from "@/lib/courses";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const at = parseFloat(req.nextUrl.searchParams.get("at") || "0");
  const seek = Math.max(0, Math.floor(at));

  const modules = await getAllCourseModules();
  let moduleSlug: string | null = null;
  for (const m of modules) {
    if (m.lessons.some((l) => l.id === id)) {
      moduleSlug = m.slug;
      break;
    }
  }
  if (!moduleSlug) {
    return Response.json(
      { error: "lesson is not part of any course module" },
      { status: 404 }
    );
  }
  const url = new URL(
    `/education/${moduleSlug}/${id}${seek > 0 ? `?t=${seek}` : ""}`,
    req.url
  );
  return NextResponse.redirect(url, { status: 302 });
}
