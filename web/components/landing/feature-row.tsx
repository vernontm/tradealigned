"use client";

/**
 * Alternating two-column row used in the landing's feature showcase.
 * On desktop: text + mockup, flipped every other row.
 * On mobile: mockup always renders on top (eye-catching), then the text.
 */

type FeatureRowProps = {
  side: "left" | "right";
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  cta?: { href: string; label: string };
  mockup: React.ReactNode;
  accent: string; // tailwind gradient stops e.g. "from-emerald-500 to-teal-600"
};

export function FeatureRow({
  side,
  eyebrow,
  title,
  body,
  cta,
  mockup,
  accent,
}: FeatureRowProps) {
  const mockupFirst = side === "left"; // mockup on the left column

  const textBlock = (
    <div className="flex flex-col justify-center">
      <div className={`text-xs font-bold uppercase tracking-[0.18em] bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
        {eyebrow}
      </div>
      <h3 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
        {title}
      </h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-zinc-400">
        {body}
      </div>
      {cta && (
        <div className="mt-6">
          <a
            href={cta.href}
            className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br ${accent} px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-xl`}
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">{cta.label}</span>
          </a>
        </div>
      )}
    </div>
  );

  const mockupBlock = (
    <div className="relative">
      <div
        className={`pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br ${accent} opacity-20 blur-2xl`}
      />
      <div className="relative">{mockup}</div>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Mobile: mockup always first. Desktop: respect side prop. */}
      <div className="order-1 lg:order-none">
        {mockupFirst ? mockupBlock : textBlock}
      </div>
      <div className="order-2 lg:order-none">
        {mockupFirst ? textBlock : mockupBlock}
      </div>
    </div>
  );
}
