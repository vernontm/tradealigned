/**
 * POST /api/stripe/sync
 *
 * Admin-only. Creates the Stripe Products + Prices defined in lib/stripe.ts.
 * Idempotent: if a product with the same metadata.ray_ai_plan_id already
 * exists, we reuse it and only create a new price if pricing changed.
 *
 * Returns the price ids you should paste into .env.local under
 * STRIPE_PRICE_*. After you set them, restart the dev server.
 *
 * curl example:
 *   curl -X POST http://localhost:3000/api/stripe/sync \
 *        -H "x-sync-secret: $STRIPE_SYNC_SECRET"
 */
import { PLANS, stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const provided = req.headers.get("x-sync-secret");
  if (!process.env.STRIPE_SYNC_SECRET || provided !== process.env.STRIPE_SYNC_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, { product_id: string; price_id: string; env: string }> = {};

  for (const [planId, plan] of Object.entries(PLANS)) {
    // 1. Find or create the product
    const existingProducts = await stripe.products.list({ limit: 100, active: true });
    let product = existingProducts.data.find(
      (p) => p.metadata.ray_ai_plan_id === plan.id
    );
    if (!product) {
      product = await stripe.products.create({
        name: plan.product_name,
        description: plan.product_description,
        metadata: { ray_ai_plan_id: plan.id },
      });
    } else if (
      product.name !== plan.product_name ||
      product.description !== plan.product_description
    ) {
      product = await stripe.products.update(product.id, {
        name: plan.product_name,
        description: plan.product_description,
      });
    }

    // 2. Find a matching active price, else create one
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let price = existingPrices.data.find(
      (p) =>
        p.unit_amount === plan.unit_amount_cents &&
        (plan.recurring === null
          ? !p.recurring
          : p.recurring?.interval === plan.recurring)
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.unit_amount_cents,
        currency: "usd",
        recurring: plan.recurring ? { interval: plan.recurring } : undefined,
        metadata: { ray_ai_plan_id: plan.id },
      });
    }

    results[planId] = {
      product_id: product.id,
      price_id: price.id,
      env: plan.price_env,
    };
  }

  // Print the env block the user should paste into .env.local
  const envBlock = Object.values(results)
    .map((r) => `${r.env}=${r.price_id}`)
    .join("\n");

  return Response.json({
    results,
    paste_into_env_local: envBlock,
    next_step:
      "Paste the lines under 'paste_into_env_local' into web/.env.local and restart the dev server.",
  });
}
