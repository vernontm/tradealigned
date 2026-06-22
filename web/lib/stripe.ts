import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY is not set, Stripe calls will fail.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // The Stripe SDK's typed API version literal narrows with every release; we
  // pin a known-good version and cast to keep the build stable across SDK
  // upgrades.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2025-09-30.clover" as any,
  appInfo: { name: "Trade Aligned by TGFX Academy", version: "0.1.0" },
});

export type RayAiPlanId =
  | "trial"
  | "ray_ai"
  | "live_trade_lab"
  | "lifetime"
  | "topup_2k"
  | "topup_5k";

export type PlanConfig = {
  id: RayAiPlanId;
  product_name: string;
  product_description: string;
  unit_amount_cents: number;
  recurring: "month" | null; // null = one-time
  /** monthly credit grant for subscription plans; for top-ups, immediate grant */
  credits_per_period: number;
  /** the env var name that holds the Stripe price id once synced */
  price_env: string;
  /** what tier to assign on app_users when purchased */
  tier:
    | "paid_standard"
    | "live_trade_lab"
    | "lifetime"
    | null;
  /** top-up credits go to topup_credits column instead of tier */
  topup_credits?: number;
};

export const PLANS: Record<RayAiPlanId, PlanConfig> = {
  // $1 7-day trial → auto-renews into ray_ai monthly. Implemented as a
  // subscription to the standard $29.99/mo price with trial_period_days: 7
  // plus a $1 setup invoice item billed today. See /api/stripe/checkout.
  trial: {
    id: "trial",
    product_name: "Trade Aligned · $1 Trial",
    product_description:
      "$1 today for 7 days of full access. Auto-renews at $29.99/mo unless cancelled.",
    unit_amount_cents: 2999,
    recurring: "month",
    credits_per_period: 3000,
    price_env: "STRIPE_PRICE_RAY_AI",
    tier: "paid_standard",
  },
  ray_ai: {
    id: "ray_ai",
    product_name: "Ray AI",
    product_description:
      "Personal mentor agent grounded in Ray's real trades. 3,000 credits per month.",
    unit_amount_cents: 2999,
    recurring: "month",
    credits_per_period: 3000,
    price_env: "STRIPE_PRICE_RAY_AI",
    tier: "paid_standard",
  },
  live_trade_lab: {
    id: "live_trade_lab",
    product_name: "Live Trade Lab + Ray AI",
    product_description:
      "Live sessions with Ray + Ray AI mentor included. 3,000 credits per month.",
    unit_amount_cents: 8000,
    recurring: "month",
    credits_per_period: 3000,
    price_env: "STRIPE_PRICE_LIVE_TRADE_LAB",
    tier: "live_trade_lab",
  },
  lifetime: {
    id: "lifetime",
    product_name: "TGFX Lifetime",
    product_description:
      "Lifetime access to TGFX Academy + Ray AI. 5,000 credits per month, forever.",
    unit_amount_cents: 50000,
    recurring: null,
    credits_per_period: 5000,
    price_env: "STRIPE_PRICE_LIFETIME",
    tier: "lifetime",
  },
  topup_2k: {
    id: "topup_2k",
    product_name: "+2,000 Ray Credits",
    product_description: "One-time top-up of 2,000 credits.",
    unit_amount_cents: 999,
    recurring: null,
    credits_per_period: 0,
    topup_credits: 2000,
    price_env: "STRIPE_PRICE_TOPUP_2K",
    tier: null,
  },
  topup_5k: {
    id: "topup_5k",
    product_name: "+5,000 Ray Credits",
    product_description: "One-time top-up of 5,000 credits.",
    unit_amount_cents: 1999,
    recurring: null,
    credits_per_period: 0,
    topup_credits: 5000,
    price_env: "STRIPE_PRICE_TOPUP_5K",
    tier: null,
  },
};

export function getPriceId(plan: RayAiPlanId): string | undefined {
  return process.env[PLANS[plan].price_env];
}
