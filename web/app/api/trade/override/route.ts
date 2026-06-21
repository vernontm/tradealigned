import { supabase } from "@/lib/supabase";

type Body = {
  trade_id?: string;
  manual_outcome?: string | null;
  hidden?: boolean;
};

const ALLOWED = new Set([
  "win",
  "loss",
  "breakeven",
  "not_my_instrument",
  "needs_manual_review",
  "unknown",
]);

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  if (!body.trade_id) {
    return Response.json({ error: "no trade_id" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.manual_outcome !== undefined) {
    if (body.manual_outcome === null) {
      patch.manual_outcome = null;
    } else if (ALLOWED.has(body.manual_outcome)) {
      patch.manual_outcome = body.manual_outcome;
    } else {
      return Response.json({ error: "invalid outcome" }, { status: 400 });
    }
  }

  if (body.hidden !== undefined) {
    patch.hidden = !!body.hidden;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trades")
    .update(patch)
    .eq("id", body.trade_id)
    .select("id, manual_outcome, hidden")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ trade: data });
}
