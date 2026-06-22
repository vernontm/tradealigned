"use client";

/**
 * Hero ambient glow, two soft pinch points (top and bottom of the section)
 * with no connecting beam, so headline + body copy stay readable.
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
    </div>
  );
}
