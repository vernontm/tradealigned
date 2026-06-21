"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Link2, Loader2, Send, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { TradeCard } from "./trade-card";

export function InsightsView() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [urlMode, setUrlMode] = useState<
    { state: "idle" } | { state: "detected"; url: string } | { state: "fetching"; url: string } | { state: "error"; url: string; msg: string }
  >({ state: "idle" });
  const [tradeCards, setTradeCards] = useState<
    Parameters<typeof TradeCard>[0]["trade"][]
  >([]);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/insights" }),
  });
  const seenTools = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    for (const m of messages) {
      for (const part of m.parts ?? []) {
        const p = part as {
          type: string;
          state?: string;
          toolCallId?: string;
          output?: unknown;
        };
        if (
          p.type === "tool-showTrade" &&
          p.state === "output-available" &&
          p.toolCallId &&
          !seenTools.current.has(p.toolCallId)
        ) {
          seenTools.current.add(p.toolCallId);
          const r = p.output as { id?: string; error?: string };
          if (!r?.error && r?.id) {
            setTradeCards((prev) =>
              prev.some((t) => t.id === r.id)
                ? prev
                : [
                    ...prev,
                    p.output as Parameters<typeof TradeCard>[0]["trade"],
                  ]
            );
          }
        }
      }
    }
  }, [messages]);

  const onPickFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onPickFile(e.dataTransfer.files?.[0] ?? null);
  };

  // URL detection helper, finds the first http(s) URL anywhere in a string
  const findUrl = (s: string): string | null => {
    const m = s.match(/https?:\/\/[^\s]+/i);
    return m ? m[0] : null;
  };

  // Watch the question field, surface a "fetch chart" affordance if a URL is detected
  useEffect(() => {
    if (imageFile) return; // already have an image; don't nag about URLs
    const url = findUrl(question);
    if (!url) {
      setUrlMode((m) => (m.state === "idle" ? m : { state: "idle" }));
      return;
    }
    setUrlMode((m) =>
      m.state !== "idle" && "url" in m && m.url === url ? m : { state: "detected", url }
    );
  }, [question, imageFile]);

  // Paste handler, accept Cmd+V of an image directly
  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          onPickFile(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  const fetchUrl = async (url: string) => {
    setUrlMode({ state: "fetching", url });
    try {
      const r = await fetch("/api/insights/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `status ${r.status}`);
      // Convert dataUrl back into a File so the rest of the flow works unchanged
      const resp = await fetch(j.dataUrl);
      const blob = await resp.blob();
      const file = new File([blob], "chart.png", { type: j.mediaType });
      setImageFile(file);
      setImagePreview(j.dataUrl);
      // Remove the URL from the question text so Ray's prompt is clean
      setQuestion((q) => q.replace(url, "").trim());
      setUrlMode({ state: "idle" });
    } catch (e) {
      setUrlMode({
        state: "error",
        url,
        msg: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const submit = async () => {
    if (!imageFile || status !== "ready") return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const mediaType = imageFile.type || "image/png";
      sendMessage({
        text: question.trim() || "what do you think about this chart?",
        files: [
          {
            type: "file",
            mediaType,
            url: `data:${mediaType};base64,${base64}`,
          },
        ],
      } as Parameters<typeof sendMessage>[0]);
      setQuestion("");
    };
    reader.readAsDataURL(imageFile);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col">
        {/* SCROLLABLE TOP: intro + chart preview + Ray's response history */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {!hasMessages && (
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Ray AI Insights
              </div>
              <h2 className="mt-1 text-xl font-semibold text-zinc-100">
                drop a chart, get my read on it
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                I&apos;ll tell you if it looks like a setup I&apos;d take, what&apos;s missing,
                and where to wait for a cleaner entry. grounded in my real trades.
              </p>
            </div>
          )}

          {!imagePreview && (
            <>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-zinc-900/50 px-6 py-12 text-center transition hover:border-emerald-400/60 hover:bg-emerald-500/15"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <div className="rounded-full bg-emerald-100 p-3">
                <Upload className="h-5 w-5 text-emerald-300" strokeWidth={2} />
              </div>
              <div className="mt-3 text-sm font-medium text-zinc-100">
                drop your chart here
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                or click to pick a file · paste a TradingView link · ⌘V to paste an image
              </div>
            </label>

            {urlMode.state !== "idle" && "url" in urlMode && (
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50/60 px-4 py-3 text-sm">
                <Link2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-emerald-200">
                    link detected
                  </div>
                  <div className="truncate text-xs text-emerald-300/80">
                    {urlMode.url}
                  </div>
                  {urlMode.state === "error" && (
                    <div className="mt-1 text-xs text-rose-600">
                      couldn&apos;t fetch: {urlMode.msg}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fetchUrl(urlMode.url)}
                  disabled={urlMode.state === "fetching"}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {urlMode.state === "fetching" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      fetching…
                    </>
                  ) : urlMode.state === "error" ? (
                    "retry"
                  ) : (
                    "fetch chart"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {imagePreview && (
          <div className="relative overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10">
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 rounded-lg bg-zinc-900/80 p-1.5 text-white backdrop-blur transition hover:bg-zinc-900"
              aria-label="remove image"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="your chart"
              className="w-full"
            />
          </div>
        )}

          <div className="mt-6 space-y-3">
            {messages.map((m: UIMessage) => (
              <InsightBubble key={m.id} m={m} />
            ))}
            {status === "streaming" && (
              <div className="text-xs italic text-zinc-400">ray is reading your chart…</div>
            )}
          </div>
        </div>

        {/* STICKY BOTTOM: textarea + submit always visible */}
        <div className="shrink-0 border-t border-white/10 bg-zinc-900/60 px-6 py-3 backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onPaste={onPaste}
              placeholder={
                imagePreview
                  ? "what's your read? thinking about buying? selling? add context…"
                  : "paste a TradingView link or ⌘V an image, or just type a question…"
              }
              rows={2}
              className="flex-1 resize-none rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            />
            <button
              type="button"
              onClick={submit}
              disabled={status !== "ready" || !imageFile}
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {!imageFile && (
            <div className="mt-1 text-[11px] text-zinc-500">
              send is enabled once a chart is loaded
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col border-l border-white/10 bg-black/30">
        <div className="shrink-0 border-b border-white/10 bg-zinc-900/60 px-6 py-3.5 backdrop-blur">
          <div className="text-sm font-semibold text-zinc-100">
            similar trades Ray has taken
          </div>
          <div className="text-[11px] text-zinc-500">
            {tradeCards.length === 0
              ? "will appear as Ray compares your chart"
              : `${tradeCards.length} matched`}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {tradeCards.length === 0 && (
            <div className="pt-16 text-center text-xs text-zinc-400">
              upload a chart to see comparable trades
            </div>
          )}
          {tradeCards.map((t) => (
            <TradeCard key={t.id} trade={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightBubble({ m }: { m: UIMessage }) {
  const isUser = m.role === "user";
  const text = (m.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("")
    // strip the appended retrieval context from displayed user messages
    .replace(/\n\n--- RAY'S SIMILAR PAST TRADES ---[\s\S]*?--- END ---/, "")
    .trim();
  if (isUser) {
    if (!text) return null;
    return (
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2 text-sm text-white shadow">
        {text}
      </div>
    );
  }
  if (!text) return null;
  return (
    <div className="rounded-2xl rounded-bl-md border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm leading-relaxed text-zinc-200 shadow-sm">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
        Ray says
      </div>
      <div className="whitespace-pre-wrap">{text}</div>
    </div>
  );
}
