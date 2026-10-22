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

export async function createCheckoutSession(input: {
  customerId?: string | null;
  customerEmail: string;
  organizationId: string;
  plan: PlanId;
}) {
  const stripe = getStripe();
  const priceId = stripePriceIdForPlan(input.plan);

  if (!priceId) {
    throw new Error(`Stripe price is not configured for plan ${input.plan}`);
  }

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
