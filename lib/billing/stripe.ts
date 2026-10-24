import Stripe from "stripe";

import type { PlanId } from "./plans";
import { stripePriceIdForPlan } from "./plans";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

/**
 * STRIPE_PRICE_STARTER should be a price ID (price_…), but a product ID
 * (prod_…) is an easy mix-up; accept it and use the product's default price.
 */
async function resolvePriceId(configured: string | undefined) {
  if (!configured) {
    throw new Error("STRIPE_PRICE_STARTER is not set");
  }
  if (!configured.startsWith("prod_")) {
    return configured;
  }
  const product = await getStripe().products.retrieve(configured);
  const defaultPrice = product.default_price;
  const id = typeof defaultPrice === "string" ? defaultPrice : defaultPrice?.id;
  if (!id) {
    throw new Error(`Product ${configured} has no default price; set STRIPE_PRICE_STARTER to its price_… ID`);
  }
  return id;
}

export async function createCheckoutSession(input: {
  customerId?: string | null;
  customerEmail: string;
  organizationId: string;
  plan: PlanId;
  /** Keep the rest of a free trial when upgrading early. */
  trialEndsAt?: Date | null;
}) {
  const stripe = getStripe();
  // Checkout only accepts a trial end at least 48 hours away; closer than
  // that, billing simply starts now.
  const keepTrial =
    input.trialEndsAt && input.trialEndsAt.getTime() - Date.now() >= 48 * 60 * 60 * 1000;
  const priceId = await resolvePriceId(stripePriceIdForPlan(input.plan));

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId ?? undefined,
    customer_email: input.customerId ? undefined : input.customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: appUrl("/settings/billing?checkout=success"),
    cancel_url: appUrl("/settings/billing?checkout=cancel"),
    metadata: {
      organizationId: input.organizationId,
      plan: input.plan,
    },
    subscription_data: {
      ...(keepTrial ? { trial_end: Math.floor(input.trialEndsAt!.getTime() / 1000) } : {}),
      metadata: {
        organizationId: input.organizationId,
        plan: input.plan,
      },
    },
  });
}

export function planFromStripePriceId(priceId: string): PlanId | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  // Legacy price IDs map to the single Starter plan.
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "starter";
  return null;
}
