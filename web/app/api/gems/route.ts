import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic();

async function generateTitle(quote: string, concept?: string | null): Promise<string | null> {
  // Only pass concept to the model if it's a real tag, not the placeholder default.
  const meaningfulConcept =
    concept && !["gem", "trade lesson"].includes(concept.toLowerCase().trim())
      ? concept
      : null;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 40,
      system: [
        "Write a punchy lowercase title for a trading mentor lesson.",
        "Hard rules:",
        "- 3 to 6 words maximum",
        "- Reply with ONLY the title text. No quotes, no punctuation, no preamble, no labels.",
        "- Lowercase, mentor-style. Active voice when possible.",
        "- Distill the lesson into a memorable phrase (a rule, principle, or imperative).",
        "- Do NOT include words like 'gem' or 'lesson' in the title.",
        'Good examples: "wait for the sweep" · "size for survival" · "trail the swing" · "stop above the wick" · "let the level confirm".',
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `${meaningfulConcept ? `Concept tag: ${meaningfulConcept}\n\n` : ""}Lesson text:\n${quote.slice(0, 600)}\n\nTitle:`,
        },
      ],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.!?]+$/g, "")
      .toLowerCase();
    return text.length > 0 && text.length < 80 ? text : null;
  } catch (e) {
    console.error("title gen failed", e);
    return null;
  }
}

type GemRow = {
  id: string;
  title: string | null;
  concept: string | null;
  quote: string;
  frame_path: string | null;
  start_sec: number;
  end_sec: number;
  clip_path: string | null;
  video_id: string | null;
  pinned_from_trade_id: string | null;
  created_at: string;
  // Supabase types one-to-many joins as arrays even when the FK is 1:1, so
  // consumers must read videos[0]. flatVideo() in auto-clip normalises this.
  videos?: { video_date: string | null; filename?: string }[] | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10));
  const limit = 24;

  let sel = supabase
    .from("teaching_moments")
    .select(
      "id, title, concept, quote, frame_path, start_sec, end_sec, clip_path, video_id, pinned_from_trade_id, created_at, videos(video_date, filename)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (q) {
    sel = sel.or(`title.ilike.%${q}%,quote.ilike.%${q}%,concept.ilike.%${q}%`);
  }

  const { data, count, error } = await sel;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    gems: (data as GemRow[] | null) ?? [],
    total: count ?? 0,
    page,
    page_size: limit,
  });
}

type CreateBody = {
  title?: string;
  concept?: string;
  quote?: string;
  frame_path?: string | null;
  video_id?: string | null;
  start_sec?: number;
  end_sec?: number;
  pinned_from_trade_id?: string | null;
};

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.quote || !body.quote.trim()) {
    return Response.json({ error: "quote is required" }, { status: 400 });
  }
  let title = body.title?.trim() || null;
  const concept = body.concept?.trim() || "gem";
  const quote = body.quote.trim();
  if (!title) {
    title = await generateTitle(quote, concept);
  }
  const insert = {
    title,
    concept,
    quote,
    frame_path: body.frame_path ?? null,
    video_id: body.video_id ?? null,
    pinned_from_trade_id: body.pinned_from_trade_id ?? null,
    start_sec: body.start_sec ?? 0,
    end_sec: body.end_sec ?? 0,
  };
  const { data, error } = await supabase
    .from("teaching_moments")
    .insert(insert)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ gem: data });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "no id" }, { status: 400 });
  const { error } = await supabase.from("teaching_moments").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
