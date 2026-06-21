"use client";

import { type Candle } from "@/lib/candle-gen";

type PositionLine = {
  price: number;
  label: string;
  tone: "entry" | "sl" | "tp";
  preview?: boolean; // render at reduced opacity to signal "would-be"
  draggable?: boolean;
};

type Props = {
  candles: Candle[];
  visibleCount: number;
  revealAll?: boolean;
  width?: number;
  height?: number;
  positionLines?: PositionLine[];
  yMinOverride?: number;
  yMaxOverride?: number;
  priceFormat?: (v: number) => string;
  /** width (in viewBox px) reserved to the right of the last candle for labels */
  rightGutter?: number;
  /** called with the new price when the draggable line is moved */
  onLineDrag?: (newPrice: number) => void;
};

/**
 * SVG candlestick chart. Always renders the full price domain of the entire
 * scenario so the y-axis stays stable when we reveal hidden candles.
 */
export function CandleChart({
  candles,
  visibleCount,
  revealAll = false,
  width = 720,
  height = 320,
  positionLines,
  yMinOverride,
  yMaxOverride,
  priceFormat,
  rightGutter = 0,
  onLineDrag,
}: Props) {
  const padding = { l: 56, r: 14, t: 14, b: 28 };
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;
  // Candles only occupy the area BEFORE the right gutter; labels sit in the gutter.
  const candleAreaW = Math.max(20, innerW - rightGutter);

  const visible = candles.slice(0, visibleCount);
  const data = revealAll ? candles : visible;

  // y-domain: pull from FULL scenario when revealing, else just visible portion
  // (this prevents the chart from shifting unfairly while predicting)
  const yPool = revealAll ? candles : visible;
  let yMin = Infinity,
    yMax = -Infinity;
  for (const c of yPool) {
    if (c.l < yMin) yMin = c.l;
    if (c.h > yMax) yMax = c.h;
  }
  // include position lines in the y-domain so they're always visible
  for (const ln of positionLines ?? []) {
    if (ln.price < yMin) yMin = ln.price;
    if (ln.price > yMax) yMax = ln.price;
  }
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad;
  yMax += yPad;
  if (Number.isFinite(yMinOverride!)) yMin = yMinOverride!;
  if (Number.isFinite(yMaxOverride!)) yMax = yMaxOverride!;
  const fmt = priceFormat ?? ((v: number) => v.toFixed(2));
  const y = (v: number) =>
    padding.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  // x: each visible candle gets a slot. When revealing, the slots span all candles.
  const slotCount = revealAll ? candles.length : visibleCount + 0;
  const slotW = candleAreaW / Math.max(1, slotCount);
  const candleBodyW = Math.max(2, slotW * 0.66);
  const xCenter = (i: number) => padding.l + slotW * (i + 0.5);
  // x position right after the last candle (where label boxes anchor)
  const labelAnchorX = padding.l + candleAreaW + 6;

  // gridlines (5 horizontal)
  const grid = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / 4;
    return { v, y: y(v) };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0c1117" />
          <stop offset="100%" stopColor="#101720" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#bgGrad)" />

      {/* horizontal grid + price axis labels */}
      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.l}
            x2={width - padding.r}
            y1={g.y}
            y2={g.y}
            stroke="#222a35"
            strokeWidth={1}
          />
          <text
            x={padding.l - 8}
            y={g.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="#7c8694"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            {fmt(g.v)}
          </text>
        </g>
      ))}

      {/* hidden-area shade when revealing, highlight the candles that were predicted */}
      {revealAll && visibleCount < candles.length && (
        <>
          <rect
            x={padding.l + slotW * visibleCount}
            y={padding.t}
            width={slotW * (candles.length - visibleCount)}
            height={innerH}
            fill="#1d2a3d"
            fillOpacity={0.55}
          />
          <line
            x1={padding.l + slotW * visibleCount}
            x2={padding.l + slotW * visibleCount}
            y1={padding.t}
            y2={padding.t + innerH}
            stroke="#3a4a63"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <text
            x={padding.l + slotW * visibleCount + 6}
            y={padding.t + 14}
            fontSize={10}
            fill="#9aa6b6"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            you predicted from here →
          </text>
        </>
      )}

      {/* candles */}
      {data.map((c, i) => {
        const bullish = c.c >= c.o;
        const fill = bullish ? "#22c55e" : "#ef4444";
        const wickX = xCenter(i);
        const bodyTop = y(Math.max(c.o, c.c));
        const bodyBot = y(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={i}>
            <line
              x1={wickX}
              x2={wickX}
              y1={y(c.h)}
              y2={y(c.l)}
              stroke={fill}
              strokeWidth={1}
            />
            <rect
              x={wickX - candleBodyW / 2}
              y={bodyTop}
              width={candleBodyW}
              height={bodyH}
              fill={fill}
              rx={1}
            />
          </g>
        );
      })}

      {/* position lines (entry / SL / TP), labels anchored to the right of the candles */}
      {(positionLines ?? []).map((ln, i) => {
        const ly = y(ln.price);
        const color =
          ln.tone === "entry"
            ? { stroke: "#a78bfa", bg: "#312e81" }
            : ln.tone === "tp"
            ? { stroke: "#22c55e", bg: "#064e3b" }
            : { stroke: "#ef4444", bg: "#7f1d1d" };
        const op = ln.preview ? 0.55 : 1;
        const labelW = 80;
        const dragCursor = ln.draggable ? "ns-resize" : "default";
        const onPointerDown = ln.draggable && onLineDrag
          ? (e: React.PointerEvent<SVGRectElement>) => {
              const svg = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement;
              svg.setPointerCapture(e.pointerId);
              const onMove = (ev: PointerEvent) => {
                const rect = svg.getBoundingClientRect();
                const vbY = ((ev.clientY - rect.top) / rect.height) * height;
                const clampedVbY = Math.max(padding.t, Math.min(padding.t + innerH, vbY));
                const price =
                  yMin + ((padding.t + innerH - clampedVbY) / innerH) * (yMax - yMin);
                onLineDrag(price);
              };
              const onUp = () => {
                svg.removeEventListener("pointermove", onMove);
                svg.removeEventListener("pointerup", onUp);
                svg.removeEventListener("pointercancel", onUp);
              };
              svg.addEventListener("pointermove", onMove);
              svg.addEventListener("pointerup", onUp);
              svg.addEventListener("pointercancel", onUp);
            }
          : undefined;
        return (
          <g key={`line-${i}`} opacity={op}>
            <line
              x1={padding.l}
              x2={width - padding.r}
              y1={ly}
              y2={ly}
              stroke={color.stroke}
              strokeWidth={ln.draggable ? 1.75 : 1.25}
              strokeDasharray={ln.preview ? "2 4" : ln.tone === "entry" ? "" : "4 3"}
              style={{ pointerEvents: "none" }}
            />
            {/* drag-handle hit area, taller and wider than the label so it's grabbable */}
            {ln.draggable && (
              <rect
                x={padding.l}
                y={ly - 10}
                width={candleAreaW + labelW + 12}
                height={20}
                fill="transparent"
                style={{ cursor: dragCursor, touchAction: "none" }}
                onPointerDown={onPointerDown}
              />
            )}
            {/* label box anchored right after the candles */}
            <rect
              x={labelAnchorX}
              y={ly - 9}
              width={labelW}
              height={16}
              rx={3}
              fill={color.bg}
              opacity={0.92}
              style={{ cursor: dragCursor, touchAction: "none" }}
              onPointerDown={onPointerDown}
            />
            <text
              x={labelAnchorX + labelW - 4}
              y={ly + 3}
              textAnchor="end"
              fontSize={10}
              fontWeight={600}
              fill="#fff"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              style={{ pointerEvents: "none" }}
            >
              {ln.label} {fmt(ln.price)}
            </text>
            {/* grab dots on draggable line */}
            {ln.draggable && (
              <g style={{ pointerEvents: "none" }}>
                <circle cx={labelAnchorX + 4} cy={ly} r={1.2} fill="#fff" />
                <circle cx={labelAnchorX + 8} cy={ly} r={1.2} fill="#fff" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
