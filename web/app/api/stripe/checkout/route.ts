/**
 * POST /api/stripe/checkout
 * Body: { plan: RayAiPlanId, email: string }
 *
 * Creates a Stripe Checkout Session for the requested plan and returns the
 * hosted-checkout URL. The student gets redirected to Stripe, completes
 * payment, and Stripe sends us a webhook.
 *
 * No real auth yet, email-only identity. Once Clerk lands, swap email for
 * the authenticated user id and pass `customer_email` from the session.
 */
import { getPriceId, PLANS, stripe, type RayAiPlanId } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

type Body = { plan?: RayAiPlanId; email?: string };

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const plan = body.plan;
  const email = body.email?.trim().toLowerCase();
  if (!plan || !(plan in PLANS)) {
    return Response.json({ error: "unknown plan" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return Response.json({ error: "valid email required" }, { status: 400 });
  }
  const priceId = getPriceId(plan);
  if (!priceId) {
    return Response.json(
      { error: `Stripe price not configured for ${plan}. Run /api/stripe/sync.` },
      { status: 500 }
    );
  }

  // Find or create the app_user by email so we have a stable record to write
  // the subscription state back to from the webhook.
  let { data: user } = await supabase
    .from("app_users")
    .select("id, stripe_customer_id")
    .ilike("email", email)
    .maybeSingle();
  if (!user) {
    const ins = await supabase
      .from("app_users")
      .insert({ email, tier: "free" })
      .select("id, stripe_customer_id")
      .single();
    if (ins.error) return Response.json({ error: ins.error.message }, { status: 500 });
    user = ins.data;
  }

  // Get / create the Stripe customer
  let customerId = user.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { app_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("app_users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const planCfg = PLANS[plan];
  const origin = new URL(req.url).origin;

  // Trial plan: free 7-day Stripe trial on the $29.99/mo Ray AI price. Card
  // is collected upfront via payment_method_collection: "always" so Stripe
  // can auto-bill on day 8. No setup fee.
  const isTrial = plan === "trial";

  const session = await stripe.checkout.sessions.create({
    mode: planCfg.recurring ? "subscription" : "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/account?checkout=success&plan=${plan}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
    ...(isTrial ? { payment_method_collection: "always" as const } : {}),
    metadata: {
      ray_ai_plan_id: plan,
      app_user_id: user.id,
    },
    ...(planCfg.recurring
      ? {
          subscription_data: {
            metadata: { ray_ai_plan_id: plan, app_user_id: user.id },
            ...(isTrial ? { trial_period_days: 7 } : {}),
          },
        }
      : {
          payment_intent_data: {
            metadata: { ray_ai_plan_id: plan, app_user_id: user.id },
          },
        }),
  });

  return Response.json({ url: session.url });
}
