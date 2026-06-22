"use client";

/**
 * Per-browser chat history store. Persists conversations to localStorage so
 * students can pick up where they left off. Designed so the same shape can
 * sync to a Supabase `chat_sessions` table once auth lands.
 */

import type { UIMessage } from "ai";

export type ChatSession = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messages: UIMessage[];
};

const INDEX_KEY = "ray-ai-chats.index.v1";
const SESSION_KEY_PREFIX = "ray-ai-chats.session.";
const ACTIVE_KEY = "ray-ai-chats.active.v1";
const PREVIEW_KEY_PREFIX = "ray-ai-chats.preview.";
const MAX_SESSIONS = 50;

/**
 * Preview cards (trade / lesson result tiles that show alongside the chat)
 * are saved per session so revisiting an old thread brings them back. Stored
 * as opaque JSON because the shape lives in app/chat/page.tsx and we don't
 * want a circular dependency.
 */
export function loadPreview(sessionId: string): unknown[] {
  if (typeof window === "undefined") return [];
  return safeParse<unknown[]>(
    window.localStorage.getItem(PREVIEW_KEY_PREFIX + sessionId),
    []
  );
}

export function savePreview(sessionId: string, cards: unknown[]) {
  if (typeof window === "undefined") return;
  try {
    if (cards.length === 0) {
      window.localStorage.removeItem(PREVIEW_KEY_PREFIX + sessionId);
    } else {
      window.localStorage.setItem(
        PREVIEW_KEY_PREFIX + sessionId,
        JSON.stringify(cards)
      );
    }
  } catch {
    // localStorage may throw on quota; preview cards are best-effort.
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ray-chats-changed"));
}

export function onChatsChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-chats-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key && (e.key === INDEX_KEY || e.key.startsWith(SESSION_KEY_PREFIX))) {
      cb();
    }
  });
  return () => window.removeEventListener("ray-chats-changed", handler);
}

type IndexEntry = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
};

function readIndex(): IndexEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse<IndexEntry[]>(
    window.localStorage.getItem(INDEX_KEY),
    []
  );
}

function writeIndex(idx: IndexEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  emit();
}

export function listSessions(): IndexEntry[] {
  return readIndex().sort((a, b) => b.updated_at - a.updated_at);
}

export function getActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function setActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
  emit();
}

export function loadSession(id: string): ChatSession | null {
  if (typeof window === "undefined") return null;
  return safeParse<ChatSession | null>(
    window.localStorage.getItem(SESSION_KEY_PREFIX + id),
    null
  );
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "new chat";
  const text = (firstUser.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "new chat";
  const words = text.split(" ").slice(0, 8).join(" ");
  return words.length > 60 ? words.slice(0, 60) + "…" : words;
}

export function saveSession(id: string, messages: UIMessage[]) {
  if (typeof window === "undefined") return;
  if (!messages || messages.length === 0) return; // never persist an empty thread
  const existing = loadSession(id);
  const now = Date.now();
  const session: ChatSession = {
    id,
    title: existing?.title || deriveTitle(messages),
    created_at: existing?.created_at || now,
    updated_at: now,
    messages,
  };
  try {
    window.localStorage.setItem(
      SESSION_KEY_PREFIX + id,
      JSON.stringify(session)
    );
  } catch {
    // Probably quota, trim oldest before retrying
    const idx = readIndex().sort((a, b) => a.updated_at - b.updated_at);
    while (idx.length > 5) {
      const old = idx.shift()!;
      window.localStorage.removeItem(SESSION_KEY_PREFIX + old.id);
    }
    writeIndex(idx);
    try {
      window.localStorage.setItem(
        SESSION_KEY_PREFIX + id,
        JSON.stringify(session)
      );
    } catch {
      // give up
    }
  }
  const idx = readIndex();
  const entry: IndexEntry = {
    id,
    title: session.title,
    created_at: session.created_at,
    updated_at: session.updated_at,
    message_count: messages.length,
  };
  const without = idx.filter((e) => e.id !== id);
  const next = [entry, ...without].slice(0, MAX_SESSIONS);
  writeIndex(next);
}

export function deleteSession(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY_PREFIX + id);
  writeIndex(readIndex().filter((e) => e.id !== id));
  if (getActiveId() === id) setActiveId(null);
}

export function newSessionId(): string {
  // crypto.randomUUID is supported in all modern browsers
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cs_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
