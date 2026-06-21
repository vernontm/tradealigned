/**
 * POST /api/stripe/portal
 * Body: { email: string }
 *
 * Returns a one-time URL to the Stripe-hosted Customer Portal so the user
 * can manage their subscription (cancel, swap payment method, see invoices).
 */
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return Response.json({ error: "valid email required" }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("app_users")
    .select("stripe_customer_id")
    .ilike("email", email)
    .maybeSingle();

  if (!user?.stripe_customer_id) {
    return Response.json(
      { error: "no Stripe customer for that email, start a subscription first." },
      { status: 404 }
    );
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${origin}/billing`,
  });

  return Response.json({ url: session.url });
}
