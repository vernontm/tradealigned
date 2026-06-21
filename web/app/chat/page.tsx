"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChatPane } from "@/components/chat-pane";
import { PreviewPane, type PreviewCard } from "@/components/preview-pane";
import { TierGate } from "@/components/tier-gate";

export default function Page() {
  const [cards, setCards] = useState<PreviewCard[]>([]);

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
    if (toolName === "showPattern") {
      const spec = result as PreviewCard extends { kind: "pattern"; spec: infer T }
        ? T
        : never;
      if (!spec || typeof spec !== "object") return;
      setCards((prev) => [{ kind: "pattern", spec }, ...prev]);
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
  }, []);

  return (
    <AppShell
      title="Mentor Chat"
      subtitle="ask, drop a chart, paste a link, grounded in real trades"
    >
      <TierGate
        feature="Mentor Chat"
        pitch="ask Ray anything, drop a chart, get a real answer in his actual voice, every reply cites a real trade or lesson with the timestamp."
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
      </TierGate>
    </AppShell>
  );
}
