import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

const PAGE_SIZE = 24;

// Outcomes a non-admin student should be able to see. Anything else
// (unknown, needs_manual_review, spoken_chart_mismatch, not_my_instrument,
// open_runner) is curation state or an unfinished trade, admins curate them;
// students only see closed, decided trades.
const STUDENT_VISIBLE_OUTCOMES = [
  "win",
  "loss",
  "breakeven",
] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const instrument = url.searchParams.get("instrument") || undefined;
  const direction = url.searchParams.get("direction") || undefined;
  const outcome = url.searchParams.get("outcome") || undefined;
  const search = url.searchParams.get("q") || undefined;
  const sort = url.searchParams.get("sort") || "date_desc";
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10));

  const me = await getCurrentAppUser();
  const isAdmin = me?.role === "admin";

  let q = supabase
    .from("trades")
    .select(
      "id, video_id, instrument, direction, final_outcome, manual_outcome, hidden, setup_type, estimated_rr, reasoning, entry_frame_path, exit_frame_path, trade_clip_path, entry_chart_time, exit_chart_time, videos(video_date)",
      { count: "exact" }
    );

  // Default: hide curated-away trades. Admin can pass ?show_hidden=1 to see them.
  const showHidden = url.searchParams.get("show_hidden") === "1" && isAdmin;
  if (!showHidden) {
    q = q.eq("hidden", false);
  }

  // Non-admins: only ever see trades with a real, student-meaningful outcome.
  // We need to match the effective outcome (manual_outcome if set, else
  // final_outcome), same logic used in the outcome filter below.
  if (!isAdmin) {
    const winList = STUDENT_VISIBLE_OUTCOMES.map((o) => `"${o}"`).join(",");
    q = q.or(
      `manual_outcome.in.(${winList}),and(manual_outcome.is.null,final_outcome.in.(${winList}))`
    );
  }

  if (instrument) q = q.eq("instrument", instrument);
  if (direction) q = q.eq("direction", direction);
  // Outcome filter, match against manual_outcome if set, else final_outcome
  if (outcome) {
    q = q.or(
      `manual_outcome.eq.${outcome},and(manual_outcome.is.null,final_outcome.eq.${outcome})`
    );
  }
  if (search) q = q.ilike("setup_type", `%${search}%`);

  // Confluences, comma-separated keywords. Each is matched against setup_type OR reasoning.
  // ALL selected confluences must be present (AND semantics) so chained filters narrow results.
  const confluencesParam = url.searchParams.get("confluences");
  if (confluencesParam) {
    const tokens = confluencesParam.split(",").map((s) => s.trim()).filter(Boolean);
    for (const t of tokens) {
      // Postgres ILIKE pattern; the .or() builder lets us OR across columns
      const safe = t.replace(/[%_]/g, "");
      q = q.or(`setup_type.ilike.%${safe}%,reasoning.ilike.%${safe}%`);
    }
  }

  // Sorting, we sort by joined video_date through ordering on a related table column
  if (sort === "rr_desc") {
    q = q.order("estimated_rr", { ascending: false, nullsFirst: false });
  } else if (sort === "rr_asc") {
    q = q.order("estimated_rr", { ascending: true, nullsFirst: false });
  } else {
    // date_desc default, use created_at since video_date join sort is awkward
    q = q.order("created_at", { ascending: sort === "date_asc" });
  }

  q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, count, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Inline facets, ALWAYS exclude hidden/archived rows from the chip counts.
  // Even when an admin is browsing the archive (?show_hidden=1) the regular
  // filter chip counts should reflect the live library only, the archive is
  // a separate space, not an inflated overlay on top of it.
  let facetBase = supabase
    .from("trades")
    .select(
      "instrument, direction, final_outcome, manual_outcome, setup_type, reasoning"
    )
    .eq("hidden", false);
  if (!isAdmin) {
    const winList = STUDENT_VISIBLE_OUTCOMES.map((o) => `"${o}"`).join(",");
    facetBase = facetBase.or(
      `manual_outcome.in.(${winList}),and(manual_outcome.is.null,final_outcome.in.(${winList}))`
    );
  }
  const { data: facetRows } = await facetBase;

  // Admins also get the archive count so the UI can label the toggle.
  let archivedCount = 0;
  if (isAdmin) {
    const { count: ac } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("hidden", true);
    archivedCount = ac ?? 0;
  }
  const instCount: Record<string, number> = {};
  const outCount: Record<string, number> = {};
  const dirCount: Record<string, number> = {};
  const conflCount: Record<string, number> = {};

  // Confluence detection, fixed taxonomy with keyword variants per label
  const CONFLUENCES: { label: string; pattern: RegExp }[] = [
    { label: "order block", pattern: /\border\s*block\b|\bob\b/i },
    { label: "order consumption", pattern: /order\s*consumption|consumption\s*wick/i },
    { label: "liquidity sweep", pattern: /liquidity\s*sweep|\bsweep\b/i },
    { label: "imbalance / FVG", pattern: /\bfvg\b|imbalance/i },
    { label: "IOP retest", pattern: /\biop\b/i },
    { label: "break of structure", pattern: /\bbos\b|break\s*of\s*structure/i },
    { label: "fib / 50% level", pattern: /\bfib(?:onacci)?\b|50%\s*level|50%\s*retr|0\.5\s*fib/i },
    { label: "head and shoulders", pattern: /head\s*and\s*shoulder|left\s*head|right\s*shoulder|h&s/i },
    { label: "compression / channel", pattern: /compression|channel\s*break|rising\s*channel|falling\s*channel/i },
    { label: "session high / low", pattern: /asia\s*(?:high|low)|london\s*(?:high|low)|ny\s*(?:high|low)|session\s*(?:high|low)/i },
    { label: "trendline break", pattern: /trendline\s*break|broke\s*the\s*trendline/i },
  ];

  for (const r of facetRows ?? []) {
    if (r.instrument) instCount[r.instrument] = (instCount[r.instrument] ?? 0) + 1;
    if (r.direction === "long" || r.direction === "short") {
      dirCount[r.direction] = (dirCount[r.direction] ?? 0) + 1;
    }
    const effective = r.manual_outcome ?? r.final_outcome;
    if (effective) outCount[effective] = (outCount[effective] ?? 0) + 1;
    const text = `${r.setup_type ?? ""} ${r.reasoning ?? ""}`;
    for (const c of CONFLUENCES) {
      if (c.pattern.test(text)) {
        conflCount[c.label] = (conflCount[c.label] ?? 0) + 1;
      }
    }
  }

  return Response.json({
    trades: data ?? [],
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
    archived_count: archivedCount,
    viewing_archive: showHidden,
    facets: {
      instruments: Object.entries(instCount)
        .sort((a, b) => b[1] - a[1])
        .map(([instrument, n]) => ({ instrument, n })),
      directions: Object.entries(dirCount)
        .sort((a, b) => b[1] - a[1])
        .map(([direction, n]) => ({ direction, n })),
      outcomes: Object.entries(outCount)
        .sort((a, b) => b[1] - a[1])
        .map(([final_outcome, n]) => ({ final_outcome, n })),
      confluences: Object.entries(conflCount)
        .sort((a, b) => b[1] - a[1])
        .map(([label, n]) => ({ label, n })),
    },
  });
}
