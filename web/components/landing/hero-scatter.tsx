"use client";

/**
 * The "scattered dashboards" background layer behind the hero, modelled on the
 * VoltX reference shot. Hand-placed instances of the mockup components tilted,
 * scaled down, faded, and slightly blurred so they read as ambient depth
 * rather than competing with the hero copy.
 *
 * Hidden on mobile, only the headline + CTA shows there.
 */

import { ChatMockup } from "./chat-mockup";
import { EducationMockup } from "./education-mockup";
import { GemsMockup } from "./gems-mockup";
import { ReplayMockup } from "./replay-mockup";

type Placement = {
  Component: React.ComponentType;
  className: string;
  // Visual depth, inline styles are how we get rotate + filter together
  style: React.CSSProperties;
};

// Positions are pinned to the SECTION (viewport-width) bounds, not the inner
// content column. Negative offsets push past the edge so the mockups read as
// "bleeding off the screen" like the VoltX scatter.
const PLACEMENTS: Placement[] = [
  // Top-left, Replay game, biggest, pushed off the left edge
  {
    Component: ReplayMockup,
    className: "absolute -left-32 top-16 w-[680px]",
    style: {
      transform: "rotate(-8deg) scale(0.95)",
      filter: "blur(2px)",
      opacity: 0.32,
    },
  },
  // Top-right, Education grid, mirror of replay
  {
    Component: EducationMockup,
    className: "absolute -right-32 top-24 w-[680px]",
    style: {
      transform: "rotate(7deg) scale(0.95)",
      filter: "blur(2px)",
      opacity: 0.32,
    },
  },
  // Bottom-left, Gems, deeper blur, lower opacity (further "back")
  {
    Component: GemsMockup,
    className: "absolute -left-56 bottom-8 w-[640px]",
    style: {
      transform: "rotate(-5deg) scale(0.88)",
      filter: "blur(3px)",
      opacity: 0.22,
    },
  },
  // Bottom-right, Chat, mid blur
  {
    Component: ChatMockup,
    className: "absolute -right-48 bottom-12 w-[560px]",
    style: {
      transform: "rotate(6deg) scale(0.9)",
      filter: "blur(2.5px)",
      opacity: 0.26,
    },
  },
];

export function HeroScatter() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
    >
      {/* Soft radial vignette so the corners fade, keeps focus on the center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 50%, transparent 30%, rgba(9,9,11,0.85) 75%)",
          zIndex: 1,
        }}
      />
      {PLACEMENTS.map(({ Component, className, style }, i) => (
        <div key={i} className={className} style={style}>
          <Component />
        </div>
      ))}
    </div>
  );
}
