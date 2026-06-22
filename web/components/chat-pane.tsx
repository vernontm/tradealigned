"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  History,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import {
  deleteSession,
  getActiveId,
  listSessions,
  loadSession,
  newSessionId,
  onChatsChange,
  saveSession,
  setActiveId,
} from "@/lib/chat-history";
import { broadcastBalance, useCreditBalance } from "@/lib/use-credit-balance";

type Props = {
  onToolResult: (toolName: string, result: unknown) => void;
};

type Attachment = {
  dataUrl: string; // base64 data URL, passed directly into the message
  mediaType: string;
  sourceLabel: string; // "your-chart.png" or the URL
};

const URL_RE = /https?:\/\/[^\s]+/i;

const STARTER_PROMPTS = [
  "what are the confluences in your winning setups?",
  "how can I make my wins better?",
  "show me 3 of your best EURUSD shorts",
  "explain order consumption wicks to me",
  "what should I look for before entering?",
  "give me a loss and tell me what went wrong",
];

export function ChatPane({ onToolResult }: Props) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [linkPreview, setLinkPreview] = useState<
    | { state: "idle" }
    | { state: "detected"; url: string }
    | { state: "fetching"; url: string }
    | { state: "error"; url: string; msg: string }
  >({ state: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return newSessionId();
    return getActiveId() || newSessionId();
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<
    ReturnType<typeof listSessions>
  >([]);
  const [hydratedMessages, setHydratedMessages] = useState<UIMessage[] | null>(
    null
  );
  // Declared early so the hydration effect can pre-seed it.
  const seenTools = useRef<Set<string>>(new Set());

  // Load the active session's messages on mount
  useEffect(() => {
    const session = loadSession(sessionId);
    setHydratedMessages(session?.messages ?? []);
    setActiveId(sessionId);
  }, [sessionId]);

  const { refresh: refreshCredits } = useCreditBalance();
  const [outOfCredits, setOutOfCredits] = useState(false);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      // Each completed turn just spent credits server-side — refresh the
      // sidebar pill so the new total appears without a page reload.
      setOutOfCredits(false);
      refreshCredits();
    },
    onError: (err) => {
      // /api/chat surfaces 402 as Error("<json body>"). Sniff for the
      // structured insufficient_credits shape and switch the UI into an
      // upgrade-prompt state instead of a generic red error toast.
      try {
        const parsed = JSON.parse(err?.message ?? "");
        if (parsed?.error === "insufficient_credits") {
          if (typeof parsed.balance === "number") {
            broadcastBalance(parsed.balance);
          }
          setOutOfCredits(true);
        }
      } catch {
        // Not a structured error — let the AI SDK's default error state
        // render in place.
      }
    },
  });

  // Hydrate the chat hook once we've read from storage
  useEffect(() => {
    if (hydratedMessages && hydratedMessages.length > 0) {
      // Mark every tool call already in the restored history as "seen"
      // so the forwarding effect doesn't replay them into the preview
      // pane (which would auto-play the last lesson on every visit).
      for (const m of hydratedMessages) {
        for (const part of m.parts ?? []) {
          const p = part as { type?: string; toolCallId?: string };
          if (p.type?.startsWith("tool-") && p.toolCallId) {
            seenTools.current.add(p.toolCallId);
          }
        }
      }
      setMessages(hydratedMessages);
    }
    // We only hydrate when sessionId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydratedMessages]);

  // Persist messages whenever they update
  useEffect(() => {
    if (messages.length > 0) saveSession(sessionId, messages);
  }, [messages, sessionId]);

  // Live-refresh history list
  useEffect(() => {
    const sync = () => setHistoryEntries(listSessions());
    sync();
    return onChatsChange(sync);
  }, []);

  const startNewChat = () => {
    const id = newSessionId();
    setSessionId(id);
    setActiveId(id);
    setMessages([]);
    seenTools.current.clear();
    setShowHistory(false);
  };

  const switchToSession = (id: string) => {
    if (id === sessionId) {
      setShowHistory(false);
      return;
    }
    setSessionId(id);
    setShowHistory(false);
  };

  const removeSession = (id: string) => {
    deleteSession(id);
    if (id === sessionId) startNewChat();
  };

  const endRef = useRef<HTMLDivElement>(null);

  // Forward tool results (showTrade) to the preview pane
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
          p.type?.startsWith("tool-") &&
          p.state === "output-available" &&
          p.toolCallId &&
          !seenTools.current.has(p.toolCallId)
        ) {
          seenTools.current.add(p.toolCallId);
          const toolName = p.type.replace(/^tool-/, "");
          onToolResult(toolName, p.output);
        }
      }
    }
  }, [messages, onToolResult]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Watch the input for URLs and surface a "fetch chart" affordance.
  useEffect(() => {
    if (attachment) return;
    const m = input.match(URL_RE);
    if (!m) {
      setLinkPreview((s) => (s.state === "idle" ? s : { state: "idle" }));
      return;
    }
    const url = m[0];
    setLinkPreview((s) =>
      "url" in s && s.url === url ? s : { state: "detected", url }
    );
  }, [input, attachment]);

  const fileToAttachment = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachment({
        dataUrl,
        mediaType: file.type,
        sourceLabel: file.name,
      });
      setLinkPreview({ state: "idle" });
    };
    reader.readAsDataURL(file);
  };

  const fetchUrlAsAttachment = async (url: string) => {
    setLinkPreview({ state: "fetching", url });
    try {
      const r = await fetch("/api/insights/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `status ${r.status}`);
      setAttachment({
        dataUrl: j.dataUrl,
        mediaType: j.mediaType,
        sourceLabel: url,
      });
      setInput((s) => s.replace(url, "").trim());
      setLinkPreview({ state: "idle" });
    } catch (e) {
      setLinkPreview({
        state: "error",
        url,
        msg: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          fileToAttachment(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) fileToAttachment(file);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !attachment) || status !== "ready") return;

    // No client-side debit — the /api/chat handler charges authoritatively
    // and surfaces a 402 via onError if the user can't afford the turn.

    const parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; url: string }
    > = [];
    if (attachment) {
      parts.push({
        type: "file",
        mediaType: attachment.mediaType,
        url: attachment.dataUrl,
      });
    }
    if (text) parts.push({ type: "text", text });
    else if (attachment)
      parts.push({
        type: "text",
        text: "here's my chart, what do you think?",
      });

    sendMessage({ parts });
    setInput("");
    setAttachment(null);
    setLinkPreview({ state: "idle" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* History bar */}
      <div className="relative flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2 sm:px-5">
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
          title="conversation history"
        >
          <History className="h-3 w-3" strokeWidth={2} />
          history ({historyEntries.length})
        </button>
        <button
          type="button"
          onClick={startNewChat}
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:opacity-90"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          new chat
        </button>
        {messages.length > 0 && (
          <span className="ml-auto truncate text-[10px] text-zinc-500">
            {messages.length} message{messages.length === 1 ? "" : "s"} in this thread
          </span>
        )}

        {showHistory && (
          <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur ring-1 ring-white/5 sm:left-5 sm:right-auto sm:w-80">
            {historyEntries.length === 0 && (
              <div className="px-4 py-3 text-[11px] text-zinc-500">
                no past chats yet.
              </div>
            )}
            {historyEntries.map((entry) => {
              const isActive = entry.id === sessionId;
              return (
                <div
                  key={entry.id}
                  className={`group flex items-start gap-2 border-b border-white/5 px-3 py-2 last:border-b-0 transition ${
                    isActive
                      ? "bg-emerald-500/10"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => switchToSession(entry.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="truncate text-xs font-medium text-zinc-100">
                      {entry.title}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {entry.message_count} msg ·{" "}
                      {new Date(entry.updated_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSession(entry.id)}
                    className="rounded p-1 text-zinc-600 opacity-0 transition hover:bg-rose-500/15 hover:text-rose-300 group-hover:opacity-100"
                    title="delete chat"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        {messages.length === 0 && (
          <div className="space-y-5 pt-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                Ray AI
              </div>
              <h2 className="mt-1 text-xl font-semibold text-zinc-100">
                what do you want to learn today?
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                ask anything, drop a chart, or paste a TradingView link. Ray
                pulls from his own trades to answer.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs font-medium text-zinc-300 shadow-sm transition hover:border-emerald-400/40 hover:bg-zinc-900/60 hover:text-zinc-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m: UIMessage) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {status === "streaming" && (
          <div className="text-xs italic text-zinc-400">ray is reading…</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Out-of-credits banner — replaces the generic AI SDK error toast so
          the user lands on a clear upgrade path instead of a red wall. */}
      {outOfCredits && (
        <div className="shrink-0 border-t border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-200">
                You&apos;re out of credits.
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                Start your 7-day free trial to keep chatting with Trade AI —
                3,000 credits each month, no charge today.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow shadow-emerald-500/40 transition hover:opacity-90"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      )}

      {/* Composer, sticky bottom */}
      <form
        onSubmit={submit}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="shrink-0 border-t border-white/10 bg-zinc-900/40 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3"
      >
        {/* Link-detected affordance */}
        {linkPreview.state !== "idle" && "url" in linkPreview && !attachment && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-emerald-200">link detected</div>
              <div className="truncate text-[11px] text-emerald-300/80">
                {linkPreview.url}
              </div>
              {linkPreview.state === "error" && (
                <div className="mt-0.5 text-[11px] text-rose-300">
                  couldn&apos;t fetch: {linkPreview.msg}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fetchUrlAsAttachment(linkPreview.url)}
              disabled={linkPreview.state === "fetching"}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {linkPreview.state === "fetching" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  fetching…
                </>
              ) : linkPreview.state === "error" ? (
                "retry"
              ) : (
                "attach"
              )}
            </button>
          </div>
        )}

        {/* Attached image preview */}
        {attachment && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-white/10 bg-zinc-950/60 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.dataUrl}
              alt="attachment"
              className="h-14 w-20 shrink-0 rounded-md object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-medium text-zinc-200">attached</div>
              <div className="truncate text-[11px] text-zinc-500">
                {attachment.sourceLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="rounded-md p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
              aria-label="remove attachment"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-white/10 bg-zinc-900/60 p-2.5 text-zinc-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
            aria-label="attach chart"
            title="attach a chart"
          >
            <Paperclip className="h-4 w-4" strokeWidth={2} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) fileToAttachment(file);
              e.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            placeholder={
              attachment
                ? "ask about this chart…"
                : "ask anything, drop a chart, or paste a TradingView link…"
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          />
          <button
            type="submit"
            disabled={
              status !== "ready" || (!input.trim() && !attachment) || outOfCredits
            }
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3.5 py-2.5 text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
          <span>
            {attachment
              ? `chart upload · ${CREDIT_COSTS.chart_roast} credits / send`
              : `text · ${CREDIT_COSTS.chat} credits / send`}
          </span>
          <span className="text-zinc-600">
            attach a chart for vision analysis
          </span>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ m }: { m: UIMessage }) {
  const text = (m.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
  // AI SDK types attachments as "file"; the "image" branch is kept for
  // backwards compatibility with older messages persisted to localStorage.
  const imageParts = (m.parts ?? []).filter(
    (p) => p.type === "file" || (p as { type: string }).type === "image"
  ) as Array<{
    type: "file" | "image";
    url?: string;
    mediaType?: string;
  }>;
  if (!text.trim() && imageParts.length === 0) return null;

  if (m.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] space-y-1.5">
        {imageParts.map((p, i) =>
          p.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={p.url}
              alt="attachment"
              className="ml-auto block max-h-64 rounded-2xl rounded-br-md ring-1 ring-emerald-400/30"
            />
          ) : null
        )}
        {text.trim() && (
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 px-3.5 py-2 text-sm text-white shadow">
            {text}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-200 shadow-sm">
      {text}
    </div>
  );
}
