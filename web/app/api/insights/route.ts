import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

// Lock to the correct v1 endpoint, the default in this SDK version drops /v1.
const anthropic = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
});
import { z } from "zod";
import { embedQuery } from "@/lib/retrieve";
import { supabase, type Trade } from "@/lib/supabase";

export const maxDuration = 60;

const SYSTEM = `You are Ray Vaughn (@rayvaughnceo), founder of TGFX Academy. A student has uploaded a chart screenshot and wants your read on it. Mentor them in YOUR voice.

VOICE & PERSPECTIVE:
- First person for your experience: "I'd be looking for…", "when I see this setup…"
- Second person to the student: "you", "your chart", "next time you spot this…"
- Lowercase-leaning, direct, encouraging but honest, says "bro/man" naturally
- Confident but never makes up prices or claims from the image

WHAT TO DO:
1. Describe what you see in the chart in trading terms, instrument if visible, timeframe, structure, key levels, recent candle behavior.
2. Identify the likely setup the student is considering or already in.
3. Compare to YOUR retrieved past trades (under "RETRIEVED CONTEXT"), what's similar, what's different.
4. Honest verdict: would you take this? what's missing? what would make it cleaner?
5. End with one concrete thing they should do next (wait for X, mark Y, look at Z timeframe).

When you reference one of your past trades, call the showTrade tool with its id so the student can compare visually.

Hard rules:
- NEVER invent prices, dates, or outcomes from your past, only what's in the retrieved records.
- If the chart is illegible or not actually a trading chart, say so honestly.
- Never use em-dashes, use a comma or period.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const last = messages[messages.length - 1];

  // Pull the student's text question (for retrieval seed)
  const queryText = (last?.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join(" ");

  // Retrieve similar Ray trades for grounding
  let contextText = "";
  if (queryText.trim()) {
    const emb = await embedQuery(queryText);
    const { data } = await supabase.rpc("match_trades", {
      query_embedding: emb,
      match_count: 6,
    });
    const trades = (data as Trade[] | null) ?? [];
    contextText = trades
      .map(
        (t) =>
          `- id=${t.id} | [${t.video_date ?? "?"}] ${t.direction ?? "?"} ${t.instrument ?? "?"} | outcome=${t.final_outcome} | RR=${t.estimated_rr ?? "?"} | setup=${t.setup_type ?? "?"}${
            t.reasoning ? `\n  reasoning: ${t.reasoning.slice(0, 280)}` : ""
          }`
      )
      .join("\n");
  }

  const augmented = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? {
          ...m,
          parts: [
            ...m.parts,
            {
              type: "text" as const,
              text: `\n\n--- RAY'S SIMILAR PAST TRADES ---\n${contextText || "(no close matches yet)"}\n--- END ---`,
            },
          ],
        }
      : m
  );

  const modelMessages = await convertToModelMessages(augmented);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM,
    messages: modelMessages,
    onError: ({ error }) => {
      console.error("[insights] streamText error:", error);
    },
    tools: {
      showTrade: {
        description:
          "Show a referenced Ray trade in the side rail so the student can visually compare. Call for EVERY past trade you reference.",
        inputSchema: z.object({
          trade_id: z.string().describe("uuid from retrieved records"),
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
    },
    stopWhen: ({ steps }) => steps.length >= 4,
  });

  return result.toUIMessageStreamResponse();
}
