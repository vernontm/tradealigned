import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Film,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { ChatMockup } from "@/components/landing/chat-mockup";
import { EducationMockup } from "@/components/landing/education-mockup";
import { FeatureRow } from "@/components/landing/feature-row";
import { GemsMockup } from "@/components/landing/gems-mockup";
import { HeroBeam } from "@/components/landing/hero-beam";
import { HeroChips } from "@/components/landing/hero-chips";
import { HeroPromptCard } from "@/components/landing/hero-prompt-card";
import { HeroScatter } from "@/components/landing/hero-scatter";
import { InstrumentMarquee } from "@/components/landing/instrument-marquee";
import { ReplayMockup } from "@/components/landing/replay-mockup";
import { TypewriterCycle } from "@/components/landing/typewriter-cycle";

// Stats computed from the live Supabase project at build/edit time. Refresh
// these when the data grows materially, keeps the landing honest.
const STATS = {
  hours: "1,000+",
  videos: "100+",
  years: "10+",
};

type Feature = { label: string; tooltip?: string };

const FREE_FEATURES: Feature[] = [
  { label: "Full TGFX Academy course" },
  { label: `${STATS.videos} lesson videos · ${STATS.hours} hours of teaching` },
  {
    label: "Preview 10 of 300+ gems",
    tooltip:
      "Gems are AI-extracted teaching moments — short clips from the curriculum that explain one principle in under 60 seconds. The full library has 300+, free accounts unlock 10 to sample.",
  },
];

// 7-day free trial of the $29.99/mo plan. Card collected upfront via
// payment_method_collection: "always" so Stripe can auto-bill on day 8.
// Cancel before day 7 → never charged. See /api/stripe/checkout.
const TRIAL_FEATURES: Feature[] = [
  { label: "Everything in Free" },
  {
    label: "Unlock all 300+ gems",
    tooltip:
      "Every AI-extracted teaching moment across the entire 1,000+ hours of training data, searchable, clipped, and timestamped back to the source lesson.",
  },
  {
    label: "3,000 AI credits for Trade AI",
    tooltip:
      "Credits power the AI Mentor. Each question or chart upload costs a few credits; 3,000 covers heavy daily use for the trial period.",
  },
  {
    label: "Access to the Drill Arcade",
    tooltip:
      "Real charts pulled from our trading database. You call the direction, mark your stop, and the AI grades your read against what actually happened.",
  },
  {
    label: "Access to live trade calls",
    tooltip:
      "Real-time alerts when our team takes a trade — entry, stop, and target — so you can shadow live setups while you learn.",
  },
  {
    label: "Weekly AI progress reports",
    tooltip:
      "Every week the AI reviews your Drill Arcade reads, Mentor questions, and lessons watched, then sends a summary of what improved and what still needs work.",
  },
];

const FAQS = [
  {
    q: "I'm a complete beginner. Will this work for me?",
    a: "Yes. The free curriculum starts at the absolute basics, what a candle is, how to read a chart, what an order block is, and walks you all the way to advanced smart-money concepts. The AI Mentor adjusts to your level, so when you ask a beginner question you get a beginner answer, not a wall of jargon.",
  },
  {
    q: "Do I need to know smart-money concepts already?",
    a: "No. The entire strategy is taught from scratch in the Beginner course. If you've never heard the terms liquidity grab, order block, or fair-value gap, you're in the right place. The AI Mentor will define anything it references the moment you ask.",
  },
  {
    q: "What happens after the 7-day trial?",
    a: "Your card on file is charged $29.99 on day 8 and you stay on the monthly plan. If you cancel any time before day 7, you're never charged a cent. There's a one-click cancel button in your account, no email, no support ticket.",
  },
  {
    q: "Is this for prop firm or funded traders?",
    a: "Yes. The strategy is the same one Ray uses in live funded-account sessions and the Drill Arcade pulls from real prop-style setups. The Mentor can also review your risk math and challenge rules if you paste them in.",
  },
  {
    q: "What if I don't get value?",
    a: "The full course library is free forever, no card required. You only ever pay if the trial proves itself to you in seven days. And if you do start the monthly plan and decide it's not for you, cancel in one click and keep what you've already learned.",
  },
  {
    q: "How is this different from a YouTube course or Discord?",
    a: "Free content tells you what to do. Trade Aligned shows you what to do, on your chart, the moment you ask, citing the exact lesson it came from. No more scrubbing through a 2-hour livestream looking for the one principle you half-remember.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-emerald-500/20 blur-[160px]" />
        <div className="absolute right-0 top-32 h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[140px]" />
      </div>

      {/* NAV */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold text-white">
              TradeAligned<sup className="text-[9px] font-bold text-zinc-400">™</sup>
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              by TGFX
            </span>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <a href="#features" className="transition hover:text-zinc-100">
            features
          </a>
          <a href="#how" className="transition hover:text-zinc-100">
            how it works
          </a>
          <a href="#pricing" className="transition hover:text-zinc-100">
            pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden text-xs font-semibold text-zinc-400 hover:text-zinc-100 sm:inline"
          >
            sign in
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
          >
            <Zap className="h-3 w-3" strokeWidth={2.5} />
            Get Started
          </Link>
        </div>
      </header>

      {/* HERO, VoltX-inspired: beam through center, scattered dashboards
          for depth, glassy chips floating in negative space, instrument
          marquee under the headline, inline prompt card anchoring the beam.

          The scatter + beam + side flag live at SECTION scope so they span
          the full viewport, not the centered 7xl content column. */}
      <section className="relative z-10 overflow-hidden">
        {/* Background depth layers, span the full viewport width */}
        <HeroScatter />
        <HeroBeam />

        {/* Foreground content column, chips + headline + CTAs */}
        <div className="relative mx-auto min-h-[860px] w-full max-w-7xl px-6 pt-12 pb-20 sm:pt-20 sm:pb-28">
          {/* Glass chips float around the inner content column so they line
              up with the headline, not the viewport edges. */}
          <HeroChips />

          {/* Hero content stack */}
          <div
            className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
            style={{ zIndex: 5 }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Trained on 1,000+ hours of live trading data
            </div>

            <h1 className="mt-5 text-balance text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl">
              <TypewriterCycle />
            </h1>

            <p className="mx-auto mt-3 text-balance text-sm font-semibold text-emerald-300 sm:text-base">
              From confused on charts to confident reads, in 30 days.
            </p>

            <p className="mx-auto mt-3 max-w-2xl text-balance text-base text-zinc-400 sm:text-lg">
              The first AI-powered trading education platform trained on smart
              money concepts and institutional-style trading.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="#pricing"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-400/80" />
              Free forever
              <span className="text-zinc-700">·</span>
              No card required
            </div>

            {/* Inline mini prompt card sitting on the beam */}
            <div className="mt-12 w-full">
              <HeroPromptCard />
            </div>

            {/* Instrument-badge marquee */}
            <div className="mt-10 w-full">
              <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                grounded in real trades across
              </div>
              <InstrumentMarquee />
            </div>

            {/* Stat strip, three value-led claims, not corpus descriptors */}
            <div className="mt-12 grid w-full gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur sm:grid-cols-3">
              <Stat
                icon={Clock}
                label="hours of training data"
                value={STATS.hours}
                sub="a private dataset most communities don't have"
              />
              <Stat
                icon={Film}
                label="full curriculum lessons"
                value={STATS.videos}
                sub="Beginner through 888 Inner Market Mastery"
              />
              <Stat
                icon={Trophy}
                label="years refined"
                value={STATS.years}
                sub="one strategy, sharpened in live markets"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — student count + pull quotes. Swap placeholder copy
          with real testimonials and the actual student count when available. */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur">
            <span className="flex -space-x-1.5">
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-zinc-950" />
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-500 ring-2 ring-zinc-950" />
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-zinc-950" />
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 ring-2 ring-zinc-950" />
            </span>
            Trusted by 1,400+ traders across 40+ countries
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Testimonial
            quote="Booked my first 2R day in week two. The AI Mentor caught a wick read I would&apos;ve missed."
            name="Marcus T."
            city="Houston, TX"
          />
          <Testimonial
            quote="I&apos;d watched the same liquidity grab lesson three times and still didn&apos;t get it. Asked the mentor, got it in one reply with the clip."
            name="Aisha O."
            city="London, UK"
          />
          <Testimonial
            quote="The drill arcade is the reason my entries finally clicked. 15 minutes a day, no more frozen on live charts."
            name="Diego R."
            city="Mexico City"
          />
        </div>
      </section>

      {/* THE TGFX PROMISE */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur sm:p-6">
          <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                why Trade Aligned exists
              </div>
              <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
                The true power behind TradeAligned is our private data.
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                While most traders failed to collect data on their specific
                trading strategy over the last few years, we&apos;ve remained
                light years ahead with over 1,000+ hours of live trading data.
                This allows us to use AI to analyze the markets on our proven
                strategy, recognize patterns, optimize, and help our students
                learn faster.
              </p>
            </div>
            <div className="lg:pl-4">
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl"
              >
                Get Started
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE ROWS, alternating text/mockup */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            what&apos;s inside
          </div>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            The Future of trading education.
          </h2>
        </div>

        <div className="space-y-24">
          {/* Row 1: Trade AI, text left, mockup right */}
          <FeatureRow
            side="right"
            eyebrow="Trade AI Mentor"
            title="Undivided time, for every student."
            body={
              <>
                <p>
                  Every trading community runs into the same issue: at some
                  point the mentor doesn&apos;t have time to give each student
                  enough one-on-one attention to maximize their growth. We
                  change that. Our AI Mentor was trained specifically on over
                  1,000+ hours of Ray&apos;s live teaching, trading, and private
                  mentoring lectures.
                </p>
                <p>
                  Now every student has the chance to ask as many questions as
                  needed and get undivided time.
                </p>
                <p>
                  Not only do you get written replies, the Mentor also scans the
                  entire database to surface screenshots and video snippets
                  relevant to your questions, something that would be impossible
                  to do manually.
                </p>
              </>
            }
            cta={{ href: "/chat", label: "open Trade AI" }}
            mockup={<ChatMockup />}
            accent="from-emerald-500 to-teal-600"
          />

          {/* Row 2: Drill Arcade, mockup left, text right */}
          <FeatureRow
            side="left"
            eyebrow="Daily Drill Arcade"
            title="Pattern recognition you can&apos;t get from re-watching."
            body={
              <>
                <p>
                  Most trading education stops at the video. You watch a
                  breakdown, nod along, and the next time price is moving in
                  real time your eye still freezes. That&apos;s because reading
                  a chart in the moment is a separate skill, one that only
                  comes from seeing thousands of setups and getting feedback on
                  each one.
                </p>
                <p>
                  No mentor can sit with every student and walk through that
                  many charts. So we built the Drill Arcade. Every round is a
                  real chart pulled from our trading database, you call the
                  direction, mark your stop, and the AI grades the read
                  against what actually happened.
                </p>
                <p>
                  You stop guessing at live setups because you&apos;ve already
                  rehearsed the read hundreds of times, under conditions a
                  human mentor could never reproduce at scale.
                </p>
              </>
            }
            cta={{ href: "/drill", label: "try a round" }}
            mockup={<ReplayMockup />}
            accent="from-fuchsia-500 to-pink-600"
          />

          {/* Row 3: Gems, text left, mockup right */}
          <FeatureRow
            side="right"
            eyebrow="Gems"
            title="Every key principle, pinned and timestamped."
            body={
              <>
                <p>
                  Every trader has had this happen, the mentor said something
                  pivotal in a livestream months ago and now you can&apos;t
                  find it. You scrub through hours of footage, give up, and
                  the insight is lost. Multiply that by 1,000+ hours of
                  content and the most valuable lessons quietly vanish into a
                  library no one can search.
                </p>
                <p>
                  Gems solves that. AI continuously scans every recording,
                  identifies the moments where a real principle was taught,
                  clips it down to the few sentences that matter, titles it,
                  and links it back to the exact second in the source video.
                </p>
                <p>
                  Instead of a wall of two-hour livestreams, you get a
                  searchable, one-paragraph index of every concept the
                  community has ever covered, surfaced the moment you ask
                  for it.
                </p>
              </>
            }
            cta={{ href: "/gems", label: "browse Gems" }}
            mockup={<GemsMockup />}
            accent="from-violet-500 to-fuchsia-600"
          />

          {/* Row 4: Education, mockup left, text right */}
          <FeatureRow
            side="left"
            eyebrow="Education · free forever"
            title="The full curriculum, free for every student."
            body={
              <>
                <p>
                  Most trading courses gate the foundation behind a paywall.
                  New traders pay hundreds of dollars before they even know if
                  the strategy is the right fit for them, and the ones who
                  can&apos;t afford it never get a shot at quality material in
                  the first place.
                </p>
                <p>
                  We took the opposite approach. Every level of the TGFX
                  curriculum is free, Beginners, Intermediate, Advanced, 888
                  Inner Market Mastery, and Psychology, every video renamed by
                  AI for scannability, thumbnailed, and organized by module so
                  you can find the lesson you need in seconds.
                </p>
                <p>
                  No paywall on Education. Ever. Make a free account, watch
                  every lesson, take what you need. The trial unlocks the AI
                  Mentor and the practice tools that turn those lessons into
                  live skill.
                </p>
              </>
            }
            cta={{ href: "/education", label: "open the course library" }}
            mockup={<EducationMockup />}
            accent="from-emerald-500 to-teal-600"
          />
        </div>
      </section>

      {/* FAQ — objection handling, placed right above pricing where it
          intercepts the final hesitation. */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            answers
          </div>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Everything you&apos;re about to ask.
          </h2>
        </div>
        <dl className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </dl>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-20 scroll-mt-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            pricing
          </div>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Start free. <br className="hidden sm:block" />
            7 days of full access on us.
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            7-day free trial of the full platform. after that it auto-renews
            at $29.99/mo unless you cancel.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
          <PriceCard
            tag="Free"
            tier="Free"
            sub="Start your trading journey now."
            features={FREE_FEATURES}
            cta={{ href: "/sign-in?mode=signup", label: "Get Started" }}
          />
          <PriceCard
            tag="Most Popular"
            tier="Free Trial"
            sub="Then $29.99/mo · cancel any day before day 7."
            features={TRIAL_FEATURES}
            cta={{
              href: "/sign-in?mode=signup&plan=trial",
              label: "Start Free Trial",
            }}
            highlight
            priceFootnote="7 days free · auto-renews at $29.99/mo"
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-10 text-center shadow-xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="relative space-y-4">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              The mentor you needed is finally <br className="hidden sm:block" />
              available 24/7.
            </h2>
            <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base">
              Every trader has spent a year stuck on the same mistakes because
              there was no one around to answer the question in the moment.
              Trade Aligned ends that. Full curriculum free, AI Mentor free
              for 7 days, the entire database working for you the second you
              join.
            </p>
            <div className="flex justify-center pt-2">
              <Link
                href="#pricing"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <div className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-500">
              <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-zinc-300">Trade Aligned</span>
            <span className="text-zinc-600">·</span>
            <span>by TGFX Academy</span>
          </div>
          <div>© {new Date().getFullYear()} TGFX Academy. all rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-zinc-500/40 bg-zinc-800/60 text-[8px] font-bold text-zinc-400 transition hover:border-emerald-400/50 hover:text-emerald-300"
        aria-label={text}
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-emerald-400/30 bg-zinc-950 px-3 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-zinc-200 opacity-0 shadow-xl ring-1 ring-emerald-400/10 transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-950"
        />
      </span>
    </span>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-zinc-950/60 px-5 py-4 backdrop-blur transition hover:border-white/20">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
        <span className="text-base font-semibold text-white">{q}</span>
        <span
          aria-hidden
          className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 transition group-open:rotate-45"
        >
          <svg viewBox="0 0 10 10" className="h-3 w-3 fill-current">
            <path d="M4.5 0h1v4h4v1h-4v4h-1V5h-4V4h4z" />
          </svg>
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a}</p>
    </details>
  );
}

function Testimonial({
  quote,
  name,
  city,
}: {
  quote: string;
  name: string;
  city: string;
}) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur">
      <div className="flex gap-0.5 text-emerald-300">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} aria-hidden className="text-sm leading-none">
            ★
          </span>
        ))}
      </div>
      <blockquote className="mt-3 text-sm leading-relaxed text-zinc-200">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">
        <span className="font-semibold text-zinc-300">{name}</span> · {city}
      </figcaption>
    </figure>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/30">
        <Icon className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
      </div>
      <div className="bg-gradient-to-br from-emerald-300 to-teal-400 bg-clip-text text-3xl font-bold text-transparent">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
        {label}
      </div>
      <div className="text-[10px] text-zinc-500">{sub}</div>
    </div>
  );
}

function PriceCard({
  tag,
  tier,
  sub,
  features,
  cta,
  highlight,
  priceFootnote,
}: {
  tag: string;
  tier: string;
  sub: string;
  features: Feature[];
  cta: { href: string; label: string };
  highlight?: boolean;
  priceFootnote?: string;
}) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl p-7 text-white shadow-xl ring-1 backdrop-blur ${
        highlight
          ? "bg-gradient-to-br from-emerald-500/15 via-zinc-900 to-zinc-950 ring-emerald-400/40"
          : "bg-zinc-950/80 ring-white/10"
      }`}
    >
      {highlight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl"
          />
        </>
      )}

      <div className="relative">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            highlight
              ? "bg-emerald-400/90 text-zinc-950"
              : "bg-white/10 text-zinc-200 ring-1 ring-white/15"
          }`}
        >
          {tag}
        </span>
        <h3 className="mt-5 text-4xl font-bold tracking-tight text-white">
          {tier}
        </h3>
        <p className="mt-2 text-sm text-zinc-400">{sub}</p>

        <div className="my-5 h-px w-full bg-white/10" />

        <ul className="space-y-3 text-sm">
          {features.map((f) => (
            <li key={f.label} className="flex items-start gap-2.5 text-zinc-200">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ${
                  highlight
                    ? "bg-emerald-400/25 ring-emerald-300/50"
                    : "bg-white/10 ring-white/15"
                }`}
              >
                <Check
                  className={`h-2.5 w-2.5 ${
                    highlight ? "text-emerald-200" : "text-zinc-300"
                  }`}
                  strokeWidth={3}
                />
              </span>
              <span className="flex items-center gap-1.5">
                {f.label}
                {f.tooltip && <InfoTooltip text={f.tooltip} />}
              </span>
            </li>
          ))}
        </ul>

        {!highlight && (
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200 shadow-sm shadow-emerald-500/20">
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden>
              <path d="M6 1l1.5 3 3.3.5L8.4 6.8l.6 3.3L6 8.5l-3 1.6.6-3.3L1.2 4.5 4.5 4z" />
            </svg>
            No credit card needed
          </div>
        )}

        {highlight && (
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current" aria-hidden>
              <path d="M6 1.5l1.4 2.85 3.15.46-2.28 2.22.54 3.13L6 8.7l-2.81 1.46.54-3.13L1.45 4.8l3.15-.46L6 1.5z" />
            </svg>
            Cancel anytime · 1 click · No questions
          </div>
        )}
      </div>

      <div className="relative mt-8 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-white">
            {highlight ? "$0" : "$0"}
            <span className="ml-1 text-xs font-medium text-zinc-500">
              {highlight ? "/ 7 days" : "/ forever"}
            </span>
          </div>
          {priceFootnote && (
            <div className="mt-0.5 text-[10px] text-zinc-500">
              {priceFootnote}
            </div>
          )}
        </div>
        <Link
          href={cta.href}
          className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition hover:opacity-90 ${
            highlight
              ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-zinc-950 shadow-emerald-500/40"
              : "bg-white text-zinc-950 shadow-white/10"
          }`}
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}
