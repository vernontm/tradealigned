"use client";

import {
  ExternalLink,
  Film,
  Gem,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { logEvent } from "@/lib/log-event";
import { useCurrentUser, useHasPaidAccess } from "@/lib/use-current-user";

// Free accounts can preview a small handful of gems unblurred. Items beyond
// this index render with a blur overlay + upgrade CTA.
const FREE_PREVIEW_LIMIT = 10;
import { useCallback, useEffect, useState } from "react";
import { toMediaUrl } from "@/lib/media";

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
  videos?: { video_date: string | null; filename?: string }[] | null;
};

type ListResponse = {
  gems: GemRow[];
  favorited_ids?: string[];
  total: number;
  page: number;
  page_size: number;
};

export function GemsView() {
  // Paid users see every gem unblurred; free users see the first
  // FREE_PREVIEW_LIMIT, with the rest blurred + locked behind an upgrade CTA.
  // hasPaidAccess is `undefined` during auth hydration — treat that as
  // "free" so we never accidentally flash the full library to a free user.
  const hasPaidAccess = useHasPaidAccess();
  const isLocked = hasPaidAccess !== true;
  const { actualRole } = useCurrentUser();
  const isAdmin = actualRole === "admin";

  const [data, setData] = useState<ListResponse | null>(null);
  const [favorited, setFavorited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set("q", search.trim());
      const r = await fetch(`/api/gems?${p.toString()}`);
      const j = (await r.json()) as ListResponse;
      setData(j);
      setFavorited(new Set(j.favorited_ids ?? []));
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadMore = useCallback(async () => {
    if (!data || loadingMore) return;
    const next = data.page + 1;
    if (next * data.page_size >= data.total) return;
    setLoadingMore(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set("q", search.trim());
      p.set("page", String(next));
      const r = await fetch(`/api/gems?${p.toString()}`);
      const j = (await r.json()) as ListResponse;
      setData({
        ...j,
        gems: [...data.gems, ...j.gems],
      });
      setFavorited((prev) => {
        const next = new Set(prev);
        for (const id of j.favorited_ids ?? []) next.add(id);
        return next;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore, search]);

  const toggleFavorite = useCallback(async (gemId: string) => {
    // Optimistic flip — endpoint will reconcile and any 4xx/5xx rolls back.
    const wasFavorited = favorited.has(gemId);
    setFavorited((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(gemId);
      else next.add(gemId);
      return next;
    });
    try {
      const r = await fetch(`/api/gems/${gemId}/favorite`, {
        method: wasFavorited ? "DELETE" : "POST",
      });
      if (!r.ok) throw new Error(`fav toggle ${r.status}`);
    } catch (e) {
      console.error("favorite toggle failed", e);
      setFavorited((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(gemId);
        else next.delete(gemId);
        return next;
      });
    }
  }, [favorited]);

  useEffect(() => {
    const t = setTimeout(loadFirstPage, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [loadFirstPage, search]);

  // Log a search event when the query settles (debounced), for admin analytics.
  useEffect(() => {
    const term = search.trim();
    if (!term) return;
    const t = setTimeout(
      () => logEvent("search", { scope: "gems", q: term }),
      800
    );
    return () => clearTimeout(t);
  }, [search]);

  const load = loadFirstPage;

  const handleDelete = async (id: string) => {
    if (!confirm("delete this gem?")) return;
    await fetch(`/api/gems?id=${id}`, { method: "DELETE" });
    load();
  };

  const handleCreated = () => {
    setShowForm(false);
    load();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-1.5 shadow-sm">
          <Search className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search gems by quote or title…"
            className="flex-1 bg-transparent text-sm placeholder-zinc-600 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          new gem
        </button>
        <div className="text-[11px] text-zinc-500">
          {loading ? "…" : `${data?.total ?? 0} gems`}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {showForm && (
          <CreateGemForm onClose={() => setShowForm(false)} onCreated={handleCreated} />
        )}
        {loading && !data && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            loading gems…
          </div>
        )}
        {!loading && data && data.gems.length === 0 && (
          <div className="pt-16 text-center text-sm text-zinc-500">
            <Gem className="mx-auto mb-2 h-8 w-8 text-emerald-200" strokeWidth={1.5} />
            no gems yet, pin a quote from a video or use “new gem”.
          </div>
        )}
        {data && data.gems.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {data.gems.map((g, i) => {
                const locked = isLocked && i >= FREE_PREVIEW_LIMIT;
                return (
                  <div key={g.id} className="relative">
                    <div
                      className={
                        locked
                          ? "pointer-events-none select-none"
                          : undefined
                      }
                      style={
                        locked
                          ? { filter: "blur(8px) saturate(0.85)" }
                          : undefined
                      }
                      aria-hidden={locked}
                    >
                      <GemCard
                        gem={g}
                        canDelete={isAdmin}
                        isFavorited={favorited.has(g.id)}
                        onToggleFavorite={() => toggleFavorite(g.id)}
                        onDelete={() => handleDelete(g.id)}
                      />
                    </div>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-zinc-950/50">
                        <Lock
                          className="h-5 w-5 text-emerald-300"
                          strokeWidth={2}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isLocked && data.gems.length > FREE_PREVIEW_LIMIT && (
              <UpgradeCta count={data.total - FREE_PREVIEW_LIMIT} />
            )}

            {!isLocked && data.gems.length < data.total && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      loading…
                    </>
                  ) : (
                    <>load more · {data.total - data.gems.length} left</>
                  )}
                </button>
                <div className="text-[10px] text-zinc-600">
                  showing {data.gems.length} of {data.total}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GemCard({
  gem: initial,
  onDelete,
  canDelete,
  isFavorited,
  onToggleFavorite,
}: {
  gem: GemRow;
  onDelete: () => void;
  canDelete: boolean;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const [gem, setGem] = useState<GemRow>(initial);
  const [mode, setMode] = useState<"clip" | "image">(
    gem.clip_path ? "clip" : "image"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<unknown>(null);

  const img = toMediaUrl(gem.frame_path);
  const clip = toMediaUrl(gem.clip_path);
  // Supabase types 1:1 joins as arrays — see GemRow comment in /api/gems.
  const date = gem.videos?.[0]?.video_date;

  // Auto-run find-clip on mount if this gem doesn't have one yet.
  // The user can still trigger manually via the button, this just removes the friction.
  useEffect(() => {
    if (gem.clip_path || busy) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      // Fire and forget, `findClip` handles its own state.
      void findClip();
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // We intentionally only re-run when the gem id or clip_path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gem.id, gem.clip_path]);

  const findClip = async () => {
    setBusy(true);
    setError(null);
    setDebug(null);
    try {
      const r = await fetch("/api/gems/auto-clip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gem_id: gem.id }),
      });
      const j = await r.json();
      if (!r.ok || j.error) {
        setError(j.error || `status ${r.status}`);
        if (j.debug) setDebug(j.debug);
        return;
      }
      setGem((g) => ({
        ...g,
        clip_path: j.clip_path,
        start_sec: j.start_sec,
        end_sec: j.end_sec,
        video_id: j.video_id,
      }));
      setMode("clip");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow">
            <Gem className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              {gem.title || gem.concept || "gem"}
            </div>
            {date && (
              <div className="text-[10px] text-zinc-500">from {date}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`rounded-md p-1 transition ${
              isFavorited
                ? "text-rose-300 hover:bg-rose-500/15"
                : "text-zinc-500 hover:bg-white/5 hover:text-rose-300"
            }`}
            title={isFavorited ? "unfavorite" : "favorite"}
            aria-pressed={isFavorited}
          >
            <Heart
              className="h-3.5 w-3.5"
              strokeWidth={2}
              fill={isFavorited ? "currentColor" : "none"}
            />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-400"
              title="delete gem (admin only)"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {(img || clip) && (
        <div className="mt-3 inline-flex rounded-xl bg-white/5 p-0.5 text-xs">
          <ToggleBtn
            active={mode === "image"}
            disabled={!img}
            onClick={() => setMode("image")}
            icon={<ImageIcon className="h-3 w-3" strokeWidth={2} />}
            label="frame"
          />
          <ToggleBtn
            active={mode === "clip"}
            disabled={!clip}
            onClick={() => {
              setMode("clip");
              logEvent("gem_view", { gem_id: gem.id });
            }}
            icon={<Play className="h-3 w-3" strokeWidth={2} />}
            label="clip"
          />
        </div>
      )}

      {(img || clip) && (
        <div className="mt-2 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
          {mode === "clip" && clip && (
            <video
              src={clip}
              controls
              preload="metadata"
              className="block w-full"
            />
          )}
          {mode === "image" && img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={gem.title ?? "gem"}
              className="block w-full"
              loading="lazy"
            />
          )}
        </div>
      )}

      <blockquote className="mt-3 border-l-2 border-emerald-400/40 pl-3 text-sm italic leading-relaxed text-zinc-300">
        &ldquo;{gem.quote}&rdquo;
      </blockquote>

      {/* Auto-clip detector */}
      {!gem.clip_path && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="min-w-0 flex-1 text-[11px] text-zinc-500">
              {error ? (
                <span className="text-rose-300">{error}</span>
              ) : busy ? (
                <span>finding the moment in the video…</span>
              ) : (
                <span>
                  <Film className="mr-1 inline h-3 w-3" strokeWidth={2} /> no
                  clip yet, auto-detect from the transcript?
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={findClip}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  cutting…
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                  find clip
                </>
              )}
            </button>
          </div>
          {debug != null && (
            <details className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10px]">
              <summary className="cursor-pointer font-mono text-rose-300">
                debug
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-rose-200">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {gem.clip_path && gem.start_sec != null && gem.end_sec != null && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-zinc-500">
            {formatTime(gem.start_sec)} → {formatTime(gem.end_sec)} ·{" "}
            {Math.round(gem.end_sec - gem.start_sec)}s
          </span>
          {gem.video_id && (
            <a
              href={`/api/lessons/${gem.video_id}/page-redirect?at=${Math.floor(gem.start_sec)}`}
              title={`open in library at ${formatTime(gem.start_sec)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200"
            >
              open in library · {formatTime(gem.start_sec)}
              <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleBtn({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-zinc-900/80 text-zinc-100 shadow-sm"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function CreateGemForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [concept, setConcept] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!quote.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/gems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          quote: quote.trim(),
          concept: concept.trim() || undefined,
        }),
      });
      if (r.ok) {
        setTitle("");
        setQuote("");
        setConcept("");
        onCreated();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
          <Gem className="h-4 w-4" strokeWidth={2} />
          new gem
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title (leave blank to auto-generate from the quote)"
          className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="the gem itself, what Ray actually said or the lesson…"
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="concept tag (optional, e.g. “patience”, “risk management”)"
          className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm outline-none placeholder-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900/60"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !quote.trim()}
          className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "saving…" : "save gem"}
        </button>
      </div>
    </div>
  );
}

function UpgradeCta({ count }: { count: number }) {
  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950 p-7 text-center shadow-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl"
      />
      <div className="relative space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
          <Lock className="h-3 w-3" strokeWidth={2.5} />
          {count}+ more gems locked
        </div>
        <h3 className="text-xl font-bold text-white">
          Unlock the full Gem library.
        </h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-400">
          Every clipped teaching moment from 1,000+ hours of live trading,
          searchable, timestamped, ready when you need it. $1 for 7 days.
        </p>
        <div className="pt-1">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50"
          >
            Start $1 Trial
          </Link>
        </div>
      </div>
    </div>
  );
}
