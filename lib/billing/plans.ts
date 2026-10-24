export type PlanId = "starter";

export const TRIAL_DAYS = 7;

export const PLAN_BENEFITS = [
  "Quote & customer management",
  "PDF estimate import",
  "Automated email follow-ups",
  "Configurable follow-up sequences",
  "Reporting & quote outcomes",
  "Pause automation when customers reply",
] as const;

export const PLAN_CATALOG: Record<
  PlanId,
  { name: string; priceMonthly: number; description: string }
> = {
  starter: {
    name: "Starter",
    priceMonthly: 39,
    description:
      "Quote management, PDF import, email follow-ups, sequences, and reporting",
  },
};

/** Maps legacy Stripe/DB plan values to the single sellable plan. */
export function normalizeSubscriptionPlan(
  plan: string | null | undefined,
): PlanId | "none" {
  if (!plan || plan === "none") {
    return "none";
  }
  if (plan === "starter") {
    return "starter";
  }
  // Legacy growth / pro subscribers keep full access; store as starter going forward.
  if (plan === "growth" || plan === "pro") {
    return "starter";
  }
  return "none";
}

export function stripePriceIdForPlan(plan: PlanId) {
  return plan === "starter" ? process.env.STRIPE_PRICE_STARTER : undefined;
}
