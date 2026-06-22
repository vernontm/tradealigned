"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChatPane } from "@/components/chat-pane";
import { PreviewPane, type PreviewCard } from "@/components/preview-pane";
import {
  getActiveId,
  loadPreview,
  onChatsChange,
  savePreview,
} from "@/lib/chat-history";

export default function Page() {
  const [cards, setCards] = useState<PreviewCard[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Subscribe to active-session changes (history clicks, new-chat button,
  // session delete) and load the saved preview cards for that session.
  useEffect(() => {
    const sync = () => {
      const id = getActiveId();
      setSessionId(id);
      setCards(id ? ((loadPreview(id) as PreviewCard[]) ?? []) : []);
    };
    sync();
    return onChatsChange(sync);
  }, []);

  // Persist preview whenever it changes for the current session — so a
  // navigate-away/back round-trip restores the same thumbnails + clips.
  useEffect(() => {
    if (!sessionId) return;
    savePreview(sessionId, cards);
  }, [cards, sessionId]);

  // Prevent the same tool result from being added twice when streaming
  // restored history through onToolResult on hydration.
  const seenIds = useRef<Set<string>>(new Set());
  // Reset seen-ids when session changes — restored cards have their own ids
  // already in state, so we want fresh re-adds for the new conversation.
  useEffect(() => {
    seenIds.current = new Set();
  }, [sessionId]);

  const onToolResult = useCallback((toolName: string, result: unknown) => {
    if (!result || typeof result !== "object") return;
    if (toolName === "showTrade") {
      const r = result as { error?: string; id?: string };
      if (r.error || !r.id) return;
      setCards((prev) => {
        if (prev.some((c) => c.kind === "trade" && c.trade.id === r.id)) {
          return prev;
        }
        return [
          {
            kind: "trade",
            trade: result as PreviewCard extends { kind: "trade"; trade: infer T }
              ? T
              : never,
          },
          ...prev,
        ];
      });
      return;
    }
    if (toolName === "showLesson") {
      const lesson = result as PreviewCard extends { kind: "lesson"; lesson: infer T }
        ? T
        : never;
      if (!lesson || typeof lesson !== "object") return;
      const candidate = lesson as { video_id?: string };
      if (!candidate.video_id) return;
      setCards((prev) => {
        if (
          prev.some(
            (c) =>
              c.kind === "lesson" &&
              c.lesson.video_id === candidate.video_id
          )
        ) {
          return prev;
        }
        return [{ kind: "lesson", lesson }, ...prev];
      });
    }
    // showPattern intentionally removed — synthetic candle diagrams retired,
    // replies cite real trades instead via showTrade.
  }, []);

  return (
    <AppShell
      title="Trade AI"
      subtitle="ask, drop a chart, paste a link, grounded in real trades"
    >
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-h-0 md:border-r md:border-white/10">
          <ChatPane onToolResult={onToolResult} />
        </div>
        {/* Preview pane hides on mobile to keep the chat full-width */}
        <div className="hidden min-h-0 md:block">
          <PreviewPane cards={cards} />
        </div>
      </div>
    </AppShell>
  );
}
