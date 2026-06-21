"use client";

/**
 * Horizontal strip of instrument badges, modelled on the VoltX token chip row.
 * Each badge is a pill with a colored dot + symbol. Repeats twice so the
 * marquee animates seamlessly across the viewport.
 */

const INSTRUMENTS: { sym: string; hue: number }[] = [
  { sym: "EURUSD", hue: 220 },
  { sym: "XAUUSD", hue: 45 },
  { sym: "NAS100", hue: 200 },
  { sym: "US30", hue: 0 },
  { sym: "GBPUSD", hue: 160 },
  { sym: "BTCUSD", hue: 30 },
  { sym: "USDJPY", hue: 350 },
  { sym: "AUDUSD", hue: 280 },
  { sym: "SPX500", hue: 120 },
];

function Badge({ sym, hue }: { sym: string; hue: number }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 backdrop-blur">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: `hsl(${hue},75%,55%)`,
          boxShadow: `0 0 8px hsla(${hue},75%,55%,0.6)`,
        }}
      />
      <span className="font-mono tracking-wider">{sym}</span>
    </div>
  );
}

export function InstrumentMarquee() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Edge fades so badges materialize / dissolve */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-zinc-950 to-transparent" />

      <div
        className="flex w-max gap-2 py-1"
        style={{ animation: "ray-marquee 30s linear infinite" }}
      >
        {[...INSTRUMENTS, ...INSTRUMENTS].map((i, idx) => (
          <Badge key={idx} sym={i.sym} hue={i.hue} />
        ))}
      </div>

      <style>{`
        @keyframes ray-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
