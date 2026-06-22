import { chargeCredits } from "@/lib/credits-server";
import { supabase } from "@/lib/supabase";
import { getCurrentAppUser } from "@/lib/supabase-server";

type TradeRow = {
  id: string;
  instrument: string | null;
  direction: string | null;
  final_outcome: string;
  setup_type: string | null;
  estimated_rr: string | null;
  reasoning: string | null;
  entry_frame_path: string | null;
  exit_frame_path: string | null;
  videos: { video_date: string | null } | { video_date: string | null }[] | null;
};

function toMediaUrl(absPath: string | null): string | null {
  if (!absPath) return null;
  const m = absPath.match(/\/trade-analyzer\/trades\/(.+)$/);
  return m ? `/media/${m[1]}` : null;
}

/**
 * Replay / Predict:
 *   Student sees the ENTRY frame (the "now" of Ray's trade).
 *   They predict the next move, UP or DOWN, independent of Ray's direction.
 *   The "correct" call is whichever direction price moved between entry and exit
 *   AS RAY POSITIONED, i.e. for a long that won, price went UP; for a long that
 *   lost, price went DOWN (the stop side). Same logic mirrored for shorts.
 */
export async function GET() {
  // Charge before the DB read so we never serve a round we won't be paid for.
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: "not authenticated" }, { status: 401 });
  }
  const charge = await chargeCredits(appUser.id, "drill_replay");
  if (!charge.ok) {
    return Response.json(
      {
        error: "insufficient_credits",
        required: charge.required,
        balance: charge.balance,
      },
      { status: 402 }
    );
  }

  const { data, error } = await supabase
    .from("trades")
    .select(
      "id, instrument, direction, final_outcome, setup_type, estimated_rr, reasoning, entry_frame_path, exit_frame_path, videos(video_date)"
    )
    .eq("position_visible", true)
    .in("final_outcome", ["win", "loss"])
    .not("entry_frame_path", "is", null)
    .not("exit_frame_path", "is", null)
    .limit(300);

  if (error || !data || data.length === 0) {
    return Response.json({ error: "no replay-ready trades" }, { status: 404 });
  }

  const trade = data[Math.floor(Math.random() * data.length)] as TradeRow;
  const date = Array.isArray(trade.videos)
    ? trade.videos[0]?.video_date
    : trade.videos?.video_date;

  // Where does price actually go?
  //   long  + win  => up
  //   long  + loss => down
  //   short + win  => down
  //   short + loss => up
  const actualDirection: "up" | "down" =
    (trade.direction === "long" && trade.final_outcome === "win") ||
    (trade.direction === "short" && trade.final_outcome === "loss")
      ? "up"
      : "down";

  return Response.json({
    id: crypto.randomUUID(),
    trade_id: trade.id,
    prompt: `you&apos;re looking at ${trade.instrument ?? "this chart"}${
      date ? ` on ${date}` : ""
    }. price is sitting right here. what does it do next?`,
    entry_image_url: toMediaUrl(trade.entry_frame_path),
    exit_image_url: toMediaUrl(trade.exit_frame_path),
    choices: ["up", "down"],
    correct_index: actualDirection === "up" ? 0 : 1,
    actual_direction: actualDirection,
    ray_took: trade.direction,
    ray_outcome: trade.final_outcome,
    ray_rr: trade.estimated_rr,
    ray_setup: trade.setup_type,
    ray_reasoning: trade.reasoning,
    meta: { video_date: date },
    credits_balance: charge.balance,
  });
}
