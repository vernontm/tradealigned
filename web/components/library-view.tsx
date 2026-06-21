"use client";

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser, useIsAdmin } from "@/lib/use-current-user";
import { TradeCard } from "./trade-card";

// Outcome values a student should ever see as a filter chip. Anything else
// (unknown, needs_manual_review, off-instrument, open_runner) is curation
// state or an unfinished trade, admins curate them, students only see
// closed wins / losses / breakevens.
const STUDENT_VISIBLE_OUTCOMES = new Set(["win", "loss", "breakeven"]);

type LibTrade = Parameters<typeof TradeCard>[0]["trade"];

type LibResponse = {
  trades: LibTrade[];
  total: number;
  page: number;
  page_size: number;
  archived_count?: number;
  viewing_archive?: boolean;
  facets: {
    instruments: { instrument: string; n: number }[];
    directions: { direction: string; n: number }[];
    outcomes: { final_outcome: string; n: number }[];
    confluences: { label: string; n: number }[];
  };
};

const OUTCOME_LABEL: Record<string, string> = {
  win: "wins",
  loss: "losses",
  breakeven: "breakeven",
};

export function LibraryView() {
  const [instrument, setInstrument] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [confluences, setConfluences] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "rr_desc" | "rr_asc">(
    "date_desc"
  );
  const [page, setPage] = useState(0);
  // Admin-only: toggle "show archived" to browse soft-deleted/hidden trades.
  // Server enforces, `show_hidden=1` is ignored for non-admins.
  const [showArchive, setShowArchive] = useState(false);
  const isAdmin = useIsAdmin();
  // Flipping the view-as toggle changes the cookie the server reads, so the
  // library response itself changes (different visible trades, different
  // facet counts). Include it in the query so the cached useCallback closure
  // invalidates and a fresh request goes out.
  const { viewAs } = useCurrentUser();
  const [data, setData] = useState<LibResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (instrument) p.set("instrument", instrument);
    if (direction) p.set("direction", direction);
    if (outcome) p.set("outcome", outcome);
    if (confluences.length) p.set("confluences", confluences.join(","));
    if (search.trim()) p.set("q", search.trim());
    p.set("sort", sort);
    p.set("page", String(page));
    if (showArchive) p.set("show_hidden", "1");
    // Add view-as as a cache buster, also makes the URL/query change so
    // the load() useCallback re-runs immediately when the toggle is flipped.
    if (viewAs === "student") p.set("v", "s");
    return p.toString();
  }, [
    instrument,
    direction,
    outcome,
    confluences,
    search,
    sort,
    page,
    showArchive,
    viewAs,
  ]);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/library?${query}`);
      const j = (await r.json()) as Partial<LibResponse> & { error?: string };
      if (!r.ok || !Array.isArray(j.trades)) {
        setError(j.error || `library failed (${r.status})`);
        return;
      }
      setData(j as LibResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "library request failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [instrument, direction, outcome, confluences, search, sort]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0); // debounce text search
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const clearAll = () => {
    setInstrument(null);
    setDirection(null);
    setOutcome(null);
    setConfluences([]);
    setSearch("");
    setSort("date_desc");
    setPage(0);
  };
  const hasFilter =
    instrument || direction || outcome || search || confluences.length > 0;
  const toggleConfluence = (label: string) =>
    setConfluences((cs) =>
      cs.includes(label) ? cs.filter((c) => c !== label) : [...cs, label]
    );

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
      {/* Filter rail */}
      <aside className="hidden h-full min-h-0 flex-col overflow-y-auto border-r border-white/10 bg-black/30 px-4 py-5 md:flex">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Filter className="h-3.5 w-3.5" strokeWidth={2} />
          filters
          {hasFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/15"
            >
              clear
            </button>
          )}
        </div>

        <FacetGroup title="instrument">
          {(data?.facets?.instruments ?? []).map((f) => (
            <FacetChip
              key={f.instrument}
              label={f.instrument}
              count={f.n}
              active={instrument === f.instrument}
              onClick={() =>
                setInstrument(instrument === f.instrument ? null : f.instrument)
              }
            />
          ))}
        </FacetGroup>

        <FacetGroup title="direction">
          {(() => {
            // Always render both long and short in a stable order, even when
            // one has 0 matches in the current filter set, facet rows just
            // get count=0 when missing from the API response.
            const counts = Object.fromEntries(
              (data?.facets?.directions ?? []).map((d) => [d.direction, d.n])
            );
            return ["long", "short"].map((d) => (
              <FacetChip
                key={d}
                label={d}
                count={counts[d] ?? 0}
                active={direction === d}
                onClick={() => setDirection(direction === d ? null : d)}
              />
            ));
          })()}
        </FacetGroup>

        <FacetGroup title="outcome">
          {(data?.facets?.outcomes ?? [])
            .filter(
              (f) => isAdmin || STUDENT_VISIBLE_OUTCOMES.has(f.final_outcome)
            )
            .map((f) => (
              <FacetChip
                key={f.final_outcome}
                label={OUTCOME_LABEL[f.final_outcome] ?? f.final_outcome}
                count={f.n}
                tone={
                  f.final_outcome === "win"
                    ? "emerald"
                    : f.final_outcome === "loss"
                    ? "rose"
                    : "zinc"
                }
                active={outcome === f.final_outcome}
                onClick={() =>
                  setOutcome(outcome === f.final_outcome ? null : f.final_outcome)
                }
              />
            ))}
        </FacetGroup>

        <FacetGroup title="confluences (any selected must match)">
          {(data?.facets?.confluences ?? []).map((f) => (
            <FacetChip
              key={f.label}
              label={f.label}
              count={f.n}
              active={confluences.includes(f.label)}
              onClick={() => toggleConfluence(f.label)}
            />
          ))}
        </FacetGroup>
      </aside>

      {/* Trade grid */}
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-1.5 shadow-sm">
            <Search className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search by setup type… (e.g. order block, sweep, IOP)"
              className="flex-1 bg-transparent text-sm placeholder-zinc-600 outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as typeof sort)
            }
            className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs shadow-sm outline-none"
          >
            <option value="date_desc">newest first</option>
            <option value="date_asc">oldest first</option>
            <option value="rr_desc">biggest R first</option>
            <option value="rr_asc">smallest R first</option>
          </select>
          <div className="text-[11px] text-zinc-500">
            {loading ? "…" : `${data?.total ?? 0} trades`}
          </div>
          {isAdmin && (data?.archived_count ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowArchive((s) => !s);
                setPage(0);
              }}
              title={
                showArchive
                  ? "back to the live library"
                  : "browse archived trades"
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                showArchive
                  ? "border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-white/10"
              }`}
            >
              <Archive className="h-3.5 w-3.5" strokeWidth={2} />
              {showArchive
                ? "viewing archive"
                : `archive · ${data?.archived_count}`}
            </button>
          )}
        </div>

        {isAdmin && showArchive && (
          <div className="shrink-0 border-b border-amber-400/30 bg-amber-500/10 px-5 py-2 text-[11px] text-amber-200">
            you&apos;re browsing the archive, students never see these trades,
            and they aren&apos;t counted in any filter. unhide a trade to put it
            back in the live library.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading && !data && (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> loading…
            </div>
          )}
          {error && !loading && (
            <div className="mx-auto max-w-md rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
              {error}
            </div>
          )}
          {data && data.trades?.length === 0 && (
            <div className="pt-16 text-center text-sm text-zinc-500">
              no trades match these filters
            </div>
          )}
          {data && (data.trades?.length ?? 0) > 0 && (
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {data.trades.map((t) => (
                <TradeCard key={t.id} trade={t} />
              ))}
            </div>
          )}
        </div>

        {data && data.total > data.page_size && (
          <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-2.5 text-xs">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              prev
            </button>
            <div className="text-zinc-500">
              page {page + 1} of {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FacetGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FacetChip({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  tone?: "emerald" | "rose" | "zinc";
  onClick: () => void;
}) {
  const activeRing =
    tone === "rose"
      ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
      : tone === "zinc"
      ? "border-zinc-700 bg-white/10 text-zinc-100"
      : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition ${
        active
          ? activeRing
          : "border-transparent text-zinc-300 hover:bg-white/10"
      }`}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" && (
        <span className="ml-2 shrink-0 text-[10px] text-zinc-400">{count}</span>
      )}
    </button>
  );
}
