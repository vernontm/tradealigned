"use client";

import { Sparkles } from "lucide-react";

export type PatternSpec = {
  name: string;
  description?: string | null;
  candles: Array<{
    type: "bullish" | "bearish" | "doji";
    body?: number; // 1..10
    upper_wick?: number; // 0..10
    lower_wick?: number; // 0..10
    label?: string;
  }>;
  annotations?: string[];
  // Optional named structural marks (S/R lines, neckline, etc.)
  marks?: Array<{
    type: "support" | "resistance" | "neckline" | "trendline";
    level: number; // 1..10, vertical band, 1 = near low
    label?: string;
  }>;
};

const PALETTE = {
  bullish: { stroke: "#22c55e", fill: "#22c55e" },
  bearish: { stroke: "#ef4444", fill: "#ef4444" },
  doji: { stroke: "#a1a1aa", fill: "#a1a1aa" },
};

/**
 * Renders a small SVG diagram of a candlestick pattern from a high-level spec.
 * The agent describes candles abstractly (type + body + wick sizes), this
 * component lays them out on a normalized 0..100 grid so the result looks
 * proportional regardless of how many candles are in the pattern.
 */
export function PatternCard({ spec }: { spec: PatternSpec }) {
  const W = 360;
  const H = 200;
  const PAD = { l: 18, r: 18, t: 14, b: 22 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const n = Math.max(1, spec.candles.length);
  const slotW = innerW / n;
  const bodyW = Math.max(6, slotW * 0.55);

  // y maps 0..10 -> bottom..top
  const y = (v: number) => PAD.t + innerH - (Math.max(0, Math.min(10, v)) / 10) * innerH;

  // We place each candle so its body center sits at "5" on the abstract scale,
  // and walk that center up/down a little for visual flow between candles so
  // multi-bar patterns (e.g. three white soldiers, double bottom) look natural.
  type Resolved = {
    cx: number;
    bodyTop: number;
    bodyBot: number;
    high: number;
    low: number;
    color: typeof PALETTE.bullish;
    label?: string;
  };

  // Determine vertical anchor per candle. Walk a "midpoint" along based on the
  // dominant slant of the pattern: count bullish vs bearish, then nudge.
  const cands = spec.candles;
  const resolved: Resolved[] = cands.map((c, i) => {
    const cx = PAD.l + slotW * (i + 0.5);
    const body = Math.max(0.5, Math.min(10, c.body ?? 3.5));
    const up = Math.max(0, Math.min(10, c.upper_wick ?? 1));
    const dn = Math.max(0, Math.min(10, c.lower_wick ?? 1));

    // Subtle drift across the pattern to give it shape, biased by candle type
    const drift = (() => {
      const t = i / Math.max(1, cands.length - 1);
      const dominant = cands.filter((x) => x.type === c.type).length;
      const direction =
        c.type === "bullish" && dominant >= cands.length / 2 ? 1 : c.type === "bearish" && dominant >= cands.length / 2 ? -1 : 0;
      return direction * (t - 0.5) * 1.4;
    })();

    const mid = 5 + drift;
    const bodyTopAbs = mid + body / 2;
    const bodyBotAbs = mid - body / 2;
    const highAbs = bodyTopAbs + up;
    const lowAbs = bodyBotAbs - dn;
    const color = PALETTE[c.type];
    return {
      cx,
      bodyTop: y(bodyTopAbs),
      bodyBot: y(bodyBotAbs),
      high: y(highAbs),
      low: y(lowAbs),
      color,
      label: c.label,
    };
  });

  // Auto-fit: rescale if any extreme goes off-canvas
  const allYs = resolved.flatMap((r) => [r.high, r.low]);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const overflow = minY < PAD.t || maxY > PAD.t + innerH;
  let scale = 1;
  let offset = 0;
  if (overflow) {
    const span = maxY - minY || 1;
    scale = innerH / span;
    offset = PAD.t - minY * scale;
  }
  const ry = (v: number) => (overflow ? v * scale + offset : v);

  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 shadow-sm ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-100">{spec.name}</div>
          {spec.description && (
            <div className="text-[11px] text-zinc-500">{spec.description}</div>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-black/60 ring-1 ring-white/10">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="patternBg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0c1117" />
              <stop offset="100%" stopColor="#101720" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#patternBg)" />

          {/* horizontal grid */}
          {Array.from({ length: 4 }).map((_, i) => {
            const yy = PAD.t + (innerH / 4) * (i + 1);
            return (
              <line
                key={i}
                x1={PAD.l}
                x2={W - PAD.r}
                y1={yy}
                y2={yy}
                stroke="#222a35"
                strokeWidth={1}
              />
            );
          })}

          {/* optional structural marks */}
          {(spec.marks ?? []).map((m, i) => {
            const yy = y(m.level);
            const color =
              m.type === "support"
                ? "#22c55e"
                : m.type === "resistance"
                ? "#ef4444"
                : "#a78bfa";
            return (
              <g key={i}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={ry(yy)}
                  y2={ry(yy)}
                  stroke={color}
                  strokeWidth={1.25}
                  strokeDasharray="4 3"
                />
                {m.label && (
                  <text
                    x={W - PAD.r - 4}
                    y={ry(yy) - 3}
                    fontSize={9}
                    textAnchor="end"
                    fill={color}
                    fontFamily="ui-monospace, SFMono-Regular, monospace"
                  >
                    {m.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* candles */}
          {resolved.map((c, i) => {
            const bodyTop = ry(c.bodyTop);
            const bodyBot = ry(c.bodyBot);
            const bodyH = Math.max(2, bodyBot - bodyTop);
            return (
              <g key={i}>
                <line
                  x1={c.cx}
                  x2={c.cx}
                  y1={ry(c.high)}
                  y2={ry(c.low)}
                  stroke={c.color.stroke}
                  strokeWidth={1.25}
                />
                <rect
                  x={c.cx - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyH}
                  fill={c.color.fill}
                  rx={1.5}
                />
                {c.label && (
                  <text
                    x={c.cx}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#9aa6b6"
                    fontFamily="ui-monospace, SFMono-Regular, monospace"
                  >
                    {c.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {spec.annotations && spec.annotations.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-zinc-400">
          {spec.annotations.map((a, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-emerald-400">·</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
