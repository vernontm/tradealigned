"use client";

/**
 * The vertical glow-beam that runs through the hero, modelled on the VoltX
 * reference shot. Two pinch points (one near the top, one near the bottom of
 * the section) connected by a thin vertical column, with a slow pulse. Pure
 * SVG so it scales cleanly and stays GPU-light.
 */

export function HeroBeam() {
  return (
    <div className="pointer-events-none absolute inset-0 flex justify-center">
      {/* Top pinch glow */}
      <div className="absolute left-1/2 top-0 h-[140px] w-[260px] -translate-x-1/2">
        <div className="absolute inset-0 rounded-full bg-emerald-400/45 blur-[60px]" />
        <div className="absolute inset-x-12 inset-y-2 rounded-full bg-emerald-300/60 blur-[30px]" />
        <div className="absolute inset-x-24 inset-y-4 rounded-full bg-white/70 blur-[12px]" />
      </div>

      {/* Bottom pinch glow */}
      <div className="absolute bottom-0 left-1/2 h-[140px] w-[260px] -translate-x-1/2">
        <div className="absolute inset-0 rounded-full bg-emerald-400/45 blur-[60px]" />
        <div className="absolute inset-x-12 inset-y-2 rounded-full bg-emerald-300/60 blur-[30px]" />
        <div className="absolute inset-x-24 inset-y-4 rounded-full bg-white/70 blur-[12px]" />
      </div>

      {/* Vertical column connecting the pinches */}
      <div
        className="absolute inset-y-0 w-px"
        style={{
          background:
            "linear-gradient(to bottom, rgba(167,243,208,0) 0%, rgba(110,231,183,0.6) 10%, rgba(167,243,208,0.95) 50%, rgba(110,231,183,0.6) 90%, rgba(167,243,208,0) 100%)",
          boxShadow:
            "0 0 14px 2px rgba(110,231,183,0.45), 0 0 36px 6px rgba(52,211,153,0.25)",
        }}
      />

      {/* Pulse overlay, slow, subtle */}
      <div
        className="absolute inset-y-0 w-1.5 -translate-x-1/2 left-1/2 opacity-60"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(255,255,255,0.25), transparent)",
          animation: "ray-beam-pulse 5s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes ray-beam-pulse {
          0%, 100% { transform: translateY(-30%) translateX(-50%); opacity: 0.3; }
          50% { transform: translateY(30%) translateX(-50%); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
