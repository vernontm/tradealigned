import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Film,
  Gem,
  GraduationCap,
  MessageSquare,
  PlayCircle,
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

// Stats computed from the live Supabase project at build/edit time. Refresh
// these when the data grows materially, keeps the landing honest.
const STATS = {
  hours: "115+",
  videos: "100+",
  gems: "390+",
  years: "10",
};

const FREE_FEATURES = [
  "every course video, beginners through 888 Inner Market Mastery",
  "starter credits to chat with Trade AI",
  "browse the Trade Library, Gems, and Drill Arcade",
  "no credit card needed",
];

// The $1 7-day trial rolls straight into the $29.99/mo plan unless cancelled , 
// so one card covers both. Underlying Stripe wiring: create subscription with
// a $1 setup fee + trial_end at signup + 7 days, then auto-bills monthly.
const TRIAL_FEATURES = [
  "everything in Free, with no credit limits",
  "full Trade AI, charts, and Drill arcade",
  "weekly progress reports + accuracy tracking",
  "cancel before day 7 and pay nothing more",
  "auto-renews at $29.99/mo unless you cancel",
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
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
              TGFX Academy
            </span>
            <span className="text-base font-bold text-white">Trade Aligned</span>
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
            href="/sign-in?mode=signup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow shadow-emerald-500/30 transition hover:opacity-90"
          >
            <Zap className="h-3 w-3" strokeWidth={2.5} />
            start free
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

        {/* Side slogan flag, pinned to the right edge of the VIEWPORT, well
            clear of the floating chips which live inside the inner column. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-8 top-40 hidden text-right 2xl:block"
          style={{ zIndex: 4 }}
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-300">
            Trade Aligned
          </div>
          <div className="mt-1 text-5xl font-black leading-[0.95] text-white">
            Trade
            <br />
            <span className="bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Aligned.
            </span>
          </div>
        </div>

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
              10 years of TGFX, distilled into one mentor
            </div>

            <h1 className="mt-5 text-balance text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl">
              Your{" "}
              <span className="bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                24/7
              </span>
              <br />
              trading mentor.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-zinc-400 sm:text-lg">
              an AI trained on every TGFX session recording, every trade called
              live, every concept taught on chart. ask any question, drop any
              setup, and get a real answer in the TGFX voice, quoting the exact
              moment it was taught. you stop guessing the next move and start
              learning faster, more efficiently, with real data backing every
              reply.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-in?mode=signup"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  create a free account
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-zinc-200 backdrop-blur transition hover:border-white/20 hover:bg-white/10"
              >
                <PlayCircle className="h-4 w-4" strokeWidth={2} />
                see how it works
              </Link>
            </div>
            <div className="mt-3 text-[11px] text-zinc-500">
              free forever for the full course library · $1 unlocks 7 days of
              everything · auto-renews at $29.99/mo unless you cancel
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

            {/* Stat strip, focused on what was ANALYZED, not raw chunks */}
            <div className="mt-12 grid w-full gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur sm:grid-cols-4">
              <Stat
                icon={Clock}
                label="hours analyzed"
                value={STATS.hours}
                sub="TGFX live sessions, mined"
              />
              <Stat
                icon={Film}
                label="videos indexed"
                value={STATS.videos}
                sub="teaching + livestreams"
              />
              <Stat
                icon={Gem}
                label="gems extracted"
                value={STATS.gems}
                sub="every teaching moment"
              />
              <Stat
                icon={Trophy}
                label="years of TGFX"
                value={STATS.years}
                sub="distilled into one agent"
              />
            </div>
          </div>
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
                no one can 1:1 every student every day. so we built one that can.
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                every TGFX livestream, every teaching video, every trade broken
                down on chart, transcribed, embedded, wired to Claude. ask and
                the answer quotes the source at the timestamp, with the clip to
                prove it.
              </p>
            </div>
            <div className="lg:pl-4">
              <Link
                href="/sign-in?mode=signup"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl"
              >
                claim your free account
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
            the whole academy, on demand.
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            chat. drill. study. learn. four surfaces, all pulling from the same
            corpus of real TGFX trading.
          </p>
        </div>

        <div className="space-y-24">
          {/* Row 1: Trade AI, text left, mockup right */}
          <FeatureRow
            side="right"
            eyebrow="Trade AI"
            title="Ask anything. Get the source."
            body={
              <>
                <p>
                  type a question. paste a chart. ask about a specific lesson by
                  name. Trade AI answers in the TGFX voice, first person, no
                  filler, and surfaces the exact moment in the course where it
                  was taught, with the timestamp pre-cued.
                </p>
                <p>
                  every cited trade comes with the entry screenshot and the 40s
                  clip. every concept comes with the lesson it came from. no
                  hallucinations. just the TGFX playbook, on demand.
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
            eyebrow="Daily Drill arcade"
            title="Practice until the read is automatic."
            body={
              <>
                <p>
                  reading a chart in the moment is a skill. you don&apos;t earn it
                  by re-watching videos, you earn it by reading thousands of
                  charts and learning what your eye misses.
                </p>
                <p>
                  the Drill Arcade puts you in front of real charts pulled from
                  TGFX trades. call the direction. set your stop. flash-read
                  the pattern. the arcade keeps evolving, new game modes drop
                  as we build them.
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
            title="The hard part of studying, done."
            body={
              <>
                <p>
                  hours of TGFX teaching videos compressed into the
                  one-paragraph principles that actually move your trading. AI
                  picks them, AI titles them, AI clips them, every gem links
                  back to the exact moment in the source video.
                </p>
                <p>
                  you stop scrubbing through 2-hour livestreams looking for the
                  one thing said about wicks. it&apos;s already pinned.
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
            title="The full TGFX course. Free with any account."
            body={
              <>
                <p>
                  Beginners. Intermediate. Advanced. 888 Inner Market Mastery.
                  Psychology. every video TGFX has taught, renamed by AI for
                  scannability, thumbnailed, and organized by module.
                </p>
                <p>
                  no paywall on Education. ever. make a free account, watch
                  every lesson, take what you need. credits unlock the live
                  mentor and the practice tools.
                </p>
              </>
            }
            cta={{ href: "/education", label: "open the course library" }}
            mockup={<EducationMockup />}
            accent="from-sky-500 to-indigo-600"
          />
        </div>
      </section>

      {/* HOW IT WORKS, pricing path */}
      <section id="how" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            how it works
          </div>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            no risk to try. cancel any day before day 7.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Step
            n="01"
            color="emerald"
            title="start free"
            desc="make an account. get starter credits. watch the entire course library, browse Gems, read the Trade Library."
          />
          <Step
            n="02"
            color="amber"
            title="$1 unlocks 7 days"
            desc="add a card. one dollar. for the next seven days you have unlimited mentor chat, every drill, every progress tool."
          />
          <Step
            n="03"
            color="cyan"
            title="auto-renews at $29.99/mo"
            desc="if you don't cancel before day 7, the card on file is charged $29.99 and you stay on monthly. cancel anytime."
          />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            pricing
          </div>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            the course is free. <br className="hidden sm:block" />
            the mentor is one dollar to try.
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            $1 covers seven days of full access. after that it auto-renews at
            $29.99/mo unless you cancel.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          <PriceCard
            tier="Free"
            price="$0"
            sub="every account starts here · no card needed"
            features={FREE_FEATURES}
            cta={{ href: "/sign-in", label: "create free account" }}
            accent="from-zinc-400 to-zinc-500"
          />
          <PriceCard
            tier="$1 · 7-day trial"
            price="$1"
            sub="then $29.99/mo · cancel any day before day 7"
            features={TRIAL_FEATURES}
            cta={{ href: "/sign-in", label: "start the $1 trial" }}
            accent="from-emerald-400 to-teal-500"
            highlight
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
              your charts are open. <br className="hidden sm:block" />
              what does the playbook say?
            </h2>
            <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base">
              free account. full course. real answers from actual TGFX
              sessions. start now, upgrade if it earns it.
            </p>
            <div className="flex justify-center pt-2">
              <Link
                href="/sign-in?mode=signup"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  create your free account
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

function Step({
  n,
  color,
  title,
  desc,
}: {
  n: string;
  color: "emerald" | "amber" | "cyan";
  title: string;
  desc: string;
}) {
  const ring = {
    emerald: "ring-emerald-400/30",
    amber: "ring-amber-400/30",
    cyan: "ring-cyan-400/30",
  }[color];
  const bg = {
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    cyan: "bg-cyan-500/15 text-cyan-300",
  }[color];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
      <div className="absolute right-4 top-4 bg-gradient-to-br from-emerald-300 to-teal-400 bg-clip-text text-3xl font-black text-transparent">
        {n}
      </div>
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${ring} ${bg}`}>
        <BookOpen className="h-4 w-4" strokeWidth={2} />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

function PriceCard({
  tier,
  price,
  sub,
  features,
  cta,
  accent,
  highlight,
}: {
  tier: string;
  price: string;
  sub: string;
  features: string[];
  cta: { href: string; label: string };
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 text-white shadow-xl ring-1 ${
        highlight ? "ring-amber-400/50" : "ring-white/10"
      }`}
    >
      {highlight && (
        <span className="absolute right-4 top-4 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200 ring-1 ring-amber-400/40">
          start here
        </span>
      )}
      <div className="space-y-1">
        <div className={`inline-flex h-8 items-center rounded-lg bg-gradient-to-br ${accent} px-2.5 text-[10px] font-bold uppercase tracking-wider text-white`}>
          {tier}
        </div>
        <div className="text-3xl font-bold text-white">{price}</div>
        <div className="text-xs text-zinc-500">{sub}</div>
      </div>
      <ul className="space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-zinc-300">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
              <Check className="h-2.5 w-2.5 text-emerald-300" strokeWidth={3} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        <Link
          href={cta.href}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${accent} px-4 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90`}
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
