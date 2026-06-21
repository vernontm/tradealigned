import { supabase } from "@/lib/supabase";
import { toMediaUrl } from "@/lib/media";

type TradeRow = {
  id: string;
  instrument: string | null;
  direction: string | null;
  final_outcome: string;
  setup_type: string | null;
  estimated_rr: string | null;
  reasoning: string | null;
  entry_frame_path: string | null;
  videos: { video_date: string | null } | { video_date: string | null }[] | null;
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Two setups are "near-duplicates" if they share the first 2 significant tokens
 * (e.g. both start with "bearish order block"). We use this to make sure distractors
 * are semantically DIFFERENT from the correct answer.
 */
function setupKeywords(s: string | null): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[\s/,;]+/)
    .filter((t) => t.length > 2 && !["the", "and", "with", "from", "into"].includes(t))
    .slice(0, 3);
}

function tooSimilar(a: string, b: string): boolean {
  const ak = new Set(setupKeywords(a));
  const bk = new Set(setupKeywords(b));
  let overlap = 0;
  for (const t of ak) if (bk.has(t)) overlap++;
  return overlap >= 2;
}

export async function GET() {
  // 50/50 between Would You Take It and Identify Setup
  const kind = Math.random() < 0.5 ? "would_you_take" : "identify_setup";

  // For identify_setup we only want trades Ray actually took.
  // For would_you_take we want BOTH:
  //   - real Ray entries (correct answer = YES, he took it)
  //   - setups he discussed but passed on (correct answer = NO, he didn't qualify it)
  const tookFilter = supabase
    .from("trades")
    .select(
      "id, instrument, direction, final_outcome, setup_type, estimated_rr, reasoning, entry_frame_path, videos(video_date)"
    )
    .in("final_outcome", ["win", "loss"])
    .eq("is_my_instrument", true)
    .eq("position_visible", true)
    .not("entry_frame_path", "is", null)
    .limit(300);

  const passedFilter = supabase
    .from("trades")
    .select(
      "id, instrument, direction, final_outcome, setup_type, estimated_rr, reasoning, entry_frame_path, videos(video_date)"
    )
    .eq("final_outcome", "needs_manual_review")
    .eq("is_my_instrument", true)
    .not("entry_frame_path", "is", null)
    .limit(300);

  let trade: TradeRow | null = null;
  let rayTookIt = true;

  if (kind === "would_you_take") {
    // 50/50 between a setup Ray took vs one he passed on
    const showPassed = Math.random() < 0.5;
    const { data: passed } = await passedFilter;
    const { data: took } = await tookFilter;
    if (showPassed && passed && passed.length > 0) {
      trade = pickRandom(passed as TradeRow[]);
      rayTookIt = false;
    } else if (took && took.length > 0) {
      trade = pickRandom(took as TradeRow[]);
      rayTookIt = true;
    }
  } else {
    const { data: took } = await tookFilter;
    if (took && took.length > 0) {
      trade = pickRandom(took as TradeRow[]);
      rayTookIt = true;
    }
  }

  if (!trade) {
    return Response.json({ error: "no trades available yet" }, { status: 404 });
  }
  const videoDate = Array.isArray(trade.videos)
    ? trade.videos[0]?.video_date
    : trade.videos?.video_date;
  const imageUrl = toMediaUrl(trade.entry_frame_path);

  if (kind === "would_you_take") {
    const choices = ["yes, take it", "no, pass", "wait for more confirmation"];
    // YES = Ray took it (regardless of W/L; he committed)
    // NO = Ray talked about it but didn't qualify it for entry
    // "wait" is a real trader move but here it's a soft distractor
    const correct_index = rayTookIt ? 0 : 1;
    const verdictNote = rayTookIt
      ? trade.final_outcome === "win"
        ? "Ray took this and it worked (W)."
        : "Ray committed to this one. it didn't pay out but the setup qualified for him to pull the trigger."
      : "Ray talked through this setup but didn't actually take it. structure didn't fully align for him.";
    return Response.json({
      id: crypto.randomUUID(),
      kind,
      trade_id: trade.id,
      prompt: `you see this ${trade.direction ?? ""} setup on ${trade.instrument ?? "?"}${videoDate ? ` (${videoDate})` : ""}. would you take this trade?`,
      image_url: imageUrl,
      choices,
      correct_index,
      explanation: `${verdictNote}\n\n${trade.reasoning ?? ""}`,
      meta: {
        direction: trade.direction,
        instrument: trade.instrument,
        setup_type: trade.setup_type,
        estimated_rr: trade.estimated_rr,
        video_date: videoDate,
      },
    });
  }

  // identify_setup: distractors must be REAL Ray setup descriptions (so they match
  // the slash-heavy multi-clause style of the correct answer) AND semantically distinct.
  const correctLabel = trade.setup_type ?? "order block retest";

  const { data: pool } = await supabase
    .from("trades")
    .select("setup_type")
    .neq("id", trade.id)
    .not("setup_type", "is", null)
    .limit(500);

  const allSetups = ((pool ?? []) as { setup_type: string }[])
    .map((r) => r.setup_type)
    .filter((s): s is string => !!s && s.length > 4);

  // Dedupe + shuffle
  const uniqueSetups = Array.from(new Set(allSetups)).sort(
    () => Math.random() - 0.5
  );

  // Pick 3 distractors that are not too similar to the correct answer
  // AND not too similar to each other
  const wrongs: string[] = [];
  for (const s of uniqueSetups) {
    if (wrongs.length >= 3) break;
    if (tooSimilar(s, correctLabel)) continue;
    if (wrongs.some((w) => tooSimilar(s, w))) continue;
    wrongs.push(s);
  }

  const choices = [...wrongs, correctLabel].sort(() => Math.random() - 0.5);
  const correct_index = choices.indexOf(correctLabel);
  return Response.json({
    id: crypto.randomUUID(),
    kind,
    trade_id: trade.id,
    prompt: `Ray took this ${trade.direction ?? "trade"} on ${trade.instrument ?? "?"}. which setup is he reading here?`,
    image_url: imageUrl,
    choices,
    correct_index,
    explanation: trade.reasoning ?? "no recorded reasoning",
    meta: {
      direction: trade.direction,
      instrument: trade.instrument,
      setup_type: trade.setup_type,
      estimated_rr: trade.estimated_rr,
      video_date: videoDate,
    },
  });
}
