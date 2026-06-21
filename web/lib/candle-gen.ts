/**
 * Synthetic candlestick generation for the Replay drill.
 *
 * Generates OHLC data with mild trend + volatility + light structure
 * (a randomly-chosen "magnet" support/resistance level) so the price action
 * looks like a real chart instead of pure noise.
 */

export type Candle = {
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
};

export type Scenario = {
  candles: Candle[];
  visibleCount: number; // how many candles to show before predicting
  actualDirection: "up" | "down";
  startPrice: number;
  finalPrice: number;
};

type Rng = () => number;

// Mulberry32, deterministic-ish PRNG so we can seed if we want reproducible
function rng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: Rng): number {
  // Box–Muller
  const u = Math.max(1e-9, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Generate a long EURUSD-flavored series for the Sniper Mode replay.
 * Start price is randomized inside a realistic band, volatility is per-candle
 * in pips. Returns the full series, the consumer reveals one candle at a time.
 */
export function generateEurUsdSeries(opts?: {
  seed?: number;
  total?: number;
  startPrice?: number;
  pipVol?: number; // typical noise size per candle, in pips (1 pip = 0.0001)
}): { candles: Candle[]; pip: number; startPrice: number } {
  const seed = opts?.seed ?? Math.floor(Math.random() * 1e9);
  const total = opts?.total ?? 360;
  const pip = 0.0001;
  const r = rng(seed);
  const startPrice = opts?.startPrice ?? 1.05 + r() * 0.05; // 1.05–1.10
  // 1m EURUSD candles: typical body 0.5–2 pips, wicks slightly more.
  // This gives 10-pip moves room to develop over 8–25 candles instead of 1–2.
  const pipVol = opts?.pipVol ?? 1.2;
  // Pick an underlying micro-trend bias for the series (slight directional drift)
  const trend = (r() - 0.5) * 0.4; // -0.2 to +0.2 pips of drift per candle
  // A magnet level to give the chart a feel of support/resistance
  const magnet = startPrice + (r() - 0.5) * pipVol * pip * 30;
  const magnetStrength = 0.18;

  const candles: Candle[] = [];
  let prevClose = startPrice;
  for (let i = 0; i < total; i++) {
    const drift = trend * pip;
    const noise = gauss(r) * pipVol * pip;
    const distToMagnet = magnet - prevClose;
    const magnetPull =
      Math.abs(distToMagnet) < pipVol * pip * 8
        ? magnetStrength * Math.sign(distToMagnet) * Math.min(pipVol * pip, Math.abs(distToMagnet))
        : 0;

    const open = prevClose;
    const close = open + drift + noise + magnetPull;
    const wickUp = Math.abs(gauss(r)) * pipVol * pip * 0.45;
    const wickDn = Math.abs(gauss(r)) * pipVol * pip * 0.45;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDn;
    candles.push({ o: open, h: high, l: low, c: close });
    prevClose = close;
  }
  return { candles, pip, startPrice };
}

export function generateScenario(opts?: {
  seed?: number;
  total?: number;
  visible?: number;
  start?: number;
  volatility?: number;
}): Scenario {
  const seed = opts?.seed ?? Math.floor(Math.random() * 1e9);
  const total = opts?.total ?? 32;
  const visible = opts?.visible ?? 22;
  const start = opts?.start ?? 100;
  const volatility = opts?.volatility ?? 0.6;

  const r = rng(seed);

  // Light directional bias for the visible portion. The future is biased in the
  // SAME direction sometimes (continuation) and the OPPOSITE direction other
  // times (reversal), 60/40 favoring continuation so the structure tells a story.
  const visibleTrend = r() < 0.5 ? 1 : -1;
  const continueAfter = r() < 0.6;
  const futureTrend = continueAfter ? visibleTrend : -visibleTrend;

  // Randomly chosen magnet level (S/R) somewhere near the start price
  const magnet = start + (r() - 0.5) * volatility * 8;
  const magnetStrength = 0.25;

  const candles: Candle[] = [];
  let prevClose = start;
  for (let i = 0; i < total; i++) {
    const trend = i < visible ? visibleTrend : futureTrend;
    const drift = trend * volatility * 0.18;
    const noise = gauss(r) * volatility;

    // Pull toward magnet, only when "close enough" so it feels like S/R
    const distToMagnet = magnet - prevClose;
    const magnetPull =
      Math.abs(distToMagnet) < volatility * 2
        ? magnetStrength * Math.sign(distToMagnet) * Math.min(volatility, Math.abs(distToMagnet))
        : 0;

    const open = prevClose;
    const close = open + drift + noise + magnetPull;
    const wickUp = Math.abs(gauss(r)) * volatility * 0.5;
    const wickDn = Math.abs(gauss(r)) * volatility * 0.5;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDn;
    candles.push({ o: open, h: high, l: low, c: close });
    prevClose = close;
  }

  const visibleClose = candles[visible - 1].c;
  const finalClose = candles[total - 1].c;
  const actualDirection: "up" | "down" =
    finalClose >= visibleClose ? "up" : "down";

  return {
    candles,
    visibleCount: visible,
    actualDirection,
    startPrice: candles[0].o,
    finalPrice: finalClose,
  };
}
