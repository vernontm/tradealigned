import { createAnthropic } from "@ai-sdk/anthropic";

// Lock to the correct v1 endpoint, the default in this SDK version drops /v1.
const anthropic = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
});
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { formatContextForLLM, retrieveContext } from "@/lib/retrieve";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

const SYSTEM = `You are Ray Vaughn (@rayvaughnceo), founder of TGFX Academy. You are 1:1 mentoring a TGFX student right now. They came to you to learn YOUR strategy. They are NOT asking you to analyze yourself in the third person, they are asking YOU to teach them.

VOICE & PERSPECTIVE, critical:
- Speak in FIRST PERSON for your own experience: "I look for…", "what I'm watching for…", "when I take a trade like that I want…"
- Address the student in SECOND PERSON: "you", "your", "look for these on your chart", "next time you see…"
- The student is the one learning. You are the teacher. They're not your therapist analyzing your trades, they're your apprentice learning from your trades.
- Direct, lowercase-leaning, mentor energy. Says "bro/man" occasionally. Confident but never arrogant. You're proud to share what you know.

CHART ATTACHMENTS:
- The student may attach a chart screenshot (or a TradingView snapshot). When they do, read the chart with your eyes, identify the instrument if labeled, the timeframe, the structure (highs, lows, breaks), any visible levels (OB zones, imbalances, sweeps), where price is now, and the candle action.
- Tell them what YOU see first, then tell them whether it looks like a setup YOU would take. Compare to your own real trades from the retrieved records when relevant, call the showTrade tool to surface the closest match so they can study it.
- If there's no obvious setup, say so plainly. "wait" is a valid call.

COURSE LESSON LINKS:
- The retrieved context may include transcript chunks from TGFX course videos (educational content where Ray teaches concepts). When you reference a CONCEPT or TECHNIQUE the student should study deeper, call the showLesson tool with the matching transcript chunk's video_id and start_sec so they can watch Ray teach it himself.
- Examples that warrant a showLesson call: order blocks, liquidity, market structure, psychology, risk management, FVG, sweeps, retests, candle reading, the daily/weekly routine.
- Inline mention pattern: write naturally in your answer, e.g. "the way I teach this in the course is…" then call showLesson so the lesson appears in the preview pane.

CANDLESTICK PATTERN DIAGRAMS:
- When the student asks about ANY candlestick pattern or formation (engulfing, doji, hammer, shooting star, double bottom/top, head & shoulders, three white soldiers, harami, pin bar, inside bar, morning/evening star, order block, order consumption wick, etc.) you MUST call the showPattern tool to render a visual diagram in the preview pane.
- Build the diagram from the candles array, each candle has type (bullish/bearish/doji), body (1-10), upper_wick (0-10), lower_wick (0-10). Make wick sizes match the pattern the student described: e.g. if they ask about a bullish engulfing with a long lower wick, set lower_wick higher on the engulfing candle.
- Use the marks array to draw structural lines (support/resistance/neckline) for patterns that need them (e.g. double bottom needs a support line at the lows).
- Add 2-4 annotations explaining what the pattern means and what to do when you see it.

EXAMPLES of the voice flip:
- Student asks: "what are the confluences of your wins?"
  → "the wins all line up the same way bro. I'm waiting for a sweep at a session level first, then a clean retest into the bearish OB. when you're at your charts, here's the checklist you want to run…"

- Student asks: "show me your best EURUSD short"
  → "here's the one I'd study if I were you. 2023-02-16, clocked 1:3.06R. notice what I did before pulling the trigger…"

- Student asks: "what should I look for in a trade?"
  → "before you take anything, you want three things lining up. first, structure. second, a sweep. third, the retest into your block…"

Hard rules:
- NEVER invent a trade, price, date, or outcome. Only reference real data from retrieved records.
- When you cite a trade you MUST call the showTrade tool with its id so the student sees the actual screenshot + clip in the preview pane.
- Short paragraphs. Avoid bullet points unless listing examples.
- Never use em-dashes, use a comma or period instead.
- End with what THEY should do or look for next, not a summary of yourself.

You have retrieved records in each user message (under "RETRIEVED CONTEXT"). Use those as your source of truth. If the records don't answer the question, say so honestly. Teaching the student to think like you matters more than impressing them.`;

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = Array.isArray(body?.messages)
    ? body.messages
    : Array.isArray(body)
    ? body
    : [];
  const converted = await convertToModelMessages(messages);

  // Pull the most recent user message text + flag if an image is attached
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  let contextText = "";
  if (lastUser) {
    const queryText = lastUser.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join(" ");
    const hasImage = (lastUser.parts ?? []).some(
      (p) =>
        p.type === "file" || (p as { type: string }).type === "image"
    );
    // Drive retrieval. If there's an image but no meaningful text, fall back to
    // a generic chart-read query so we still pull similar setups for the agent.
    const effectiveQuery = queryText.trim()
      ? queryText.trim()
      : hasImage
      ? "chart setup retest order block sweep liquidity imbalance"
      : "";
    if (effectiveQuery) {
      const ctx = await retrieveContext(effectiveQuery);
      contextText = formatContextForLLM(ctx);
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: contextText
      ? `${SYSTEM}\n\n--- RETRIEVED CONTEXT FOR CURRENT QUESTION ---\n${contextText}\n--- END CONTEXT ---`
      : SYSTEM,
    messages: converted,
    tools: {
      showTrade: {
        description:
          "Render a trade card in the preview pane with the entry screenshot and the stitched video clip. Call this for EVERY trade you reference in your response.",
        inputSchema: z.object({
          trade_id: z.string().describe("uuid from the retrieved records"),
        }),
        execute: async ({ trade_id }) => {
          const { data } = await supabase
            .from("trades")
            .select(
              "id, video_id, instrument, direction, final_outcome, setup_type, estimated_rr, reasoning, entry_frame_path, exit_frame_path, trade_clip_path, entry_chart_time, exit_chart_time, videos(video_date)"
            )
            .eq("id", trade_id)
            .single();
          return data ?? { error: "trade not found" };
        },
      },
      showLesson: {
        description:
          "Surface a TGFX course video lesson clip in the preview pane so the student can watch Ray teach the concept directly. Call this when the retrieved context includes a teaching video chunk that's relevant to your answer.",
        inputSchema: z.object({
          video_id: z.string().describe("uuid from the retrieved transcript chunk"),
          start_sec: z
            .number()
            .min(0)
            .describe("seconds from the start of the video where Ray begins teaching this concept"),
          end_sec: z
            .number()
            .min(0)
            .optional()
            .describe("optional end time (default = start + 90s)"),
          concept: z
            .string()
            .describe("short concept name, lowercase (e.g. 'order blocks')"),
        }),
        execute: async ({ video_id, start_sec, end_sec, concept }) => {
          const { data } = await supabase
            .from("videos")
            .select("id, filename, display_name, kind, source_path")
            .eq("id", video_id)
            .single();
          if (!data) return { error: "video not found" };
          return {
            video_id,
            title: data.display_name || data.filename,
            kind: data.kind,
            start_sec,
            end_sec: end_sec ?? start_sec + 90,
            concept,
          };
        },
      },
      showPattern: {
        description:
          "Render an SVG candlestick pattern diagram in the preview pane. Call this WHENEVER the student asks about a pattern, formation, or candle structure. Build the candle sequence to match what the student described (e.g. for a bullish engulfing with a long lower wick, the second candle has a high body and high lower_wick).",
        inputSchema: z.object({
          name: z.string().describe("the pattern name, lowercase, e.g. 'bullish engulfing'"),
          description: z
            .string()
            .optional()
            .describe("one-line plain-English description of the pattern"),
          candles: z
            .array(
              z.object({
                type: z.enum(["bullish", "bearish", "doji"]),
                body: z.number().min(0.5).max(10).optional(),
                upper_wick: z.number().min(0).max(10).optional(),
                lower_wick: z.number().min(0).max(10).optional(),
                label: z.string().optional(),
              })
            )
            .min(1)
            .max(8)
            .describe("ordered candles that compose the pattern (1-8 candles)"),
          marks: z
            .array(
              z.object({
                type: z.enum(["support", "resistance", "neckline", "trendline"]),
                level: z.number().min(0).max(10),
                label: z.string().optional(),
              })
            )
            .optional()
            .describe("optional horizontal structure lines (e.g. neckline at the lows of a double bottom)"),
          annotations: z
            .array(z.string())
            .min(1)
            .max(5)
            .describe("2-4 short bullets explaining what the pattern means and how to trade it"),
        }),
        execute: async (spec) => spec, // pass through to the client
      },
    },
    stopWhen: stepCountIs(4),
    onError(err) {
      // The AI SDK passes either an Error, a `{error: ...}` envelope, or a
      // serialized payload. JSON.stringify({}) drops Error fields, so log all
      // angles to surface model/provider failures.
      const e = err as { error?: unknown } | Error;
      const inner =
        e && typeof e === "object" && "error" in e ? e.error : e;
      const detail =
        inner instanceof Error
          ? { name: inner.name, message: inner.message, stack: inner.stack }
          : inner;
      console.error("[chat] stream error:", JSON.stringify(detail, null, 2));
    },
  });

  return result.toUIMessageStreamResponse();
}
