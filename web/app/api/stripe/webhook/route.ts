/**
 * Stripe webhook. Verifies signatures + updates app_users + writes a credit
 * ledger row when payments land.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 *
 * The webhook secret printed by that command goes in STRIPE_WEBHOOK_SECRET.
 */
import type Stripe from "stripe";
import { brandedEmail, sendEmail } from "@/lib/resend";
import { PLANS, stripe, type RayAiPlanId } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export const config = { api: { bodyParser: false } };

async function sendWelcomeEmail(email: string, planId: RayAiPlanId) {
  const isTrial = planId === "trial";
  const heading = isTrial
    ? "You're in. 7 days of full access, on us."
    : "Welcome to Trade Aligned.";
  const body = isTrial
    ? `<p>Your $1 trial is live. For the next 7 days you have the full platform unlocked: AI Mentor, Drill Arcade, every gem, live trade calls, and weekly progress reports.</p>
<p>On day 8 your card auto-renews at $29.99/mo. Cancel any time before then with one click from your billing page and you're never charged again.</p>
<p>Start with the AI Mentor — drop a chart, ask anything, and watch it cite the exact lesson it learned from.</p>`
    : `<p>Your subscription is active. Every feature on the platform is now unlocked, AI Mentor, Drill Arcade, gems, live trade calls, weekly progress reports.</p>
<p>Jump back in whenever you're ready.</p>`;

  await sendEmail({
    to: email,
    subject: isTrial
      ? "Your Trade Aligned trial is live"
      : "Welcome to Trade Aligned",
    html: brandedEmail({
      preheader: isTrial
        ? "7 days of full access. Cancel anytime."
        : "Your subscription is active.",
      heading,
      body,
      ctaUrl: "https://tradealigned.com/chat",
      ctaLabel: "Open the AI Mentor",
    }),
  });
}

async function grantSubscription(
  appUserId: string,
  planId: RayAiPlanId,
  subscriptionId: string,
  periodEndsAt: Date | null
) {
  const plan = PLANS[planId];
  if (!plan.tier) return;
  await supabase
    .from("app_users")
    .update({
      tier: plan.tier,
      stripe_subscription_id: subscriptionId,
      current_period_ends_at: periodEndsAt?.toISOString() ?? null,
      paid_started_at: new Date().toISOString(),
    })
    .eq("id", appUserId);

  if (plan.credits_per_period > 0) {
    await supabase.from("credit_ledger").insert({
      user_id: appUserId,
      kind: "grant",
      amount: plan.credits_per_period,
      reason: `subscription_grant:${planId}`,
      metadata: { stripe_subscription_id: subscriptionId },
    });
  }
}

async function grantLifetime(
  appUserId: string,
  paymentIntentId: string
) {
  const plan = PLANS.lifetime;
  await supabase
    .from("app_users")
    .update({
      tier: plan.tier!,
      paid_started_at: new Date().toISOString(),
    })
    .eq("id", appUserId);
  await supabase.from("credit_ledger").insert({
    user_id: appUserId,
    kind: "grant",
    amount: plan.credits_per_period,
    reason: "lifetime_grant",
    metadata: { stripe_payment_intent_id: paymentIntentId },
  });
}

async function grantTopup(
  appUserId: string,
  planId: "topup_2k" | "topup_5k",
  paymentIntentId: string
) {
  const plan = PLANS[planId];
  const credits = plan.topup_credits ?? 0;
  if (credits === 0) return;
  // Increment topup_credits (separate ledger column, never expires)
  const { data } = await supabase
    .from("app_users")
    .select("topup_credits")
    .eq("id", appUserId)
    .single();
  const current = (data?.topup_credits as number | undefined) ?? 0;
  await supabase
    .from("app_users")
    .update({ topup_credits: current + credits })
    .eq("id", appUserId);
  await supabase.from("credit_ledger").insert({
    user_id: appUserId,
    kind: "grant",
    amount: credits,
    reason: `topup:${planId}`,
    metadata: { stripe_payment_intent_id: paymentIntentId },
  });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return new Response("missing signature/secret", { status: 400 });
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`signature verification failed: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const planId = session.metadata?.ray_ai_plan_id as RayAiPlanId | undefined;
        const appUserId = session.metadata?.app_user_id as string | undefined;
        if (!planId || !appUserId) break;

        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const item = sub.items.data[0];
          const periodEnd = item?.current_period_end
            ? new Date(item.current_period_end * 1000)
            : null;
          await grantSubscription(appUserId, planId, sub.id, periodEnd);

          // Welcome email. Wrapped so a Resend hiccup never makes us 5xx the
          // webhook (Stripe would retry and grantSubscription would re-run).
          try {
            const email =
              session.customer_details?.email || session.customer_email;
            if (email) {
              await sendWelcomeEmail(email, planId);
            }
          } catch (e) {
            console.error("[webhook] welcome email failed", e);
          }
        } else if (session.mode === "payment") {
          const pi =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? "unknown");
          if (planId === "lifetime") {
            await grantLifetime(appUserId, pi);
          } else if (planId === "topup_2k" || planId === "topup_5k") {
            await grantTopup(appUserId, planId, pi);
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const planId = sub.metadata?.ray_ai_plan_id as RayAiPlanId | undefined;
        const appUserId = sub.metadata?.app_user_id as string | undefined;
        if (!appUserId) break;
        const item = sub.items.data[0];
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null;
        const active = ["active", "trialing", "past_due"].includes(sub.status);
        await supabase
          .from("app_users")
          .update({
            tier: active && planId ? (PLANS[planId].tier ?? "free") : "free",
            current_period_ends_at: periodEnd?.toISOString() ?? null,
            stripe_subscription_id: active ? sub.id : null,
          })
          .eq("id", appUserId);
        break;
      }
      case "invoice.paid": {
        // Monthly refresh, credit the recurring grant
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = invoice.subscription;
        if (!subRef) break;
        const subId = typeof subRef === "string" ? subRef : subRef.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const planId = sub.metadata?.ray_ai_plan_id as RayAiPlanId | undefined;
        const appUserId = sub.metadata?.app_user_id as string | undefined;
        if (!planId || !appUserId) break;
        const plan = PLANS[planId];
        if (plan.credits_per_period > 0) {
          await supabase.from("credit_ledger").insert({
            user_id: appUserId,
            kind: "grant",
            amount: plan.credits_per_period,
            reason: `monthly_refresh:${planId}`,
            metadata: {
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: subId,
            },
          });
        }
        break;
      }
      default:
        // ignore everything else for now
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return new Response("handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
