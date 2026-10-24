import type { organizations } from "@/lib/db/schema";

export type BillingSnapshot = {
  plan: (typeof organizations.$inferSelect)["subscriptionPlan"];
  status: (typeof organizations.$inferSelect)["subscriptionStatus"];
  trialEndsAt: Date | null;
};

export type Entitlements = {
  pilotMode: boolean;
  hasActiveAccess: boolean;
  canUseFollowUps: boolean;
  canImportPdf: boolean;
  canViewReports: boolean;
  canUseTeamFeatures: boolean;
};

/**
 * A Stripe subscription exists (even if it's still in its trial period, after
 * an early upgrade). The free trial alone has no subscription.
 */
export function hasPaidSubscription(org: {
  stripeSubscriptionId: string | null;
  subscriptionStatus: BillingSnapshot["status"];
}) {
  return (
    Boolean(org.stripeSubscriptionId) &&
    ["trialing", "active", "past_due"].includes(org.subscriptionStatus)
  );
}

/** Days left in the free trial, or null when not on one. */
export function trialDaysLeft(billing: BillingSnapshot & { stripeSubscriptionId: string | null }) {
  if (billing.status !== "trialing" || !billing.trialEndsAt || billing.stripeSubscriptionId) {
    return null;
  }
  const msLeft = billing.trialEndsAt.getTime() - Date.now();
  // An ended trial isn't a trial any more: the owner subscribes rather than upgrades.
  return msLeft > 0 ? Math.ceil(msLeft / 86_400_000) : null;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function resolveEntitlements(billing: BillingSnapshot): Entitlements {
  if (!isStripeConfigured()) {
    return {
      pilotMode: true,
      hasActiveAccess: true,
      canUseFollowUps: true,
      canImportPdf: true,
      canViewReports: true,
      canUseTeamFeatures: true,
    };
  }

  const now = Date.now();
  const trialActive =
    billing.status === "trialing" &&
    billing.trialEndsAt !== null &&
    billing.trialEndsAt.getTime() > now;

  const subscriptionActive =
    billing.status === "active" || billing.status === "past_due" || trialActive;

  const hasPaidOrTrialPlan =
    billing.plan === "starter" ||
    billing.plan === "growth" ||
    billing.plan === "pro";

  const hasActiveAccess =
    subscriptionActive && (hasPaidOrTrialPlan || trialActive);

  return {
    pilotMode: false,
    hasActiveAccess,
    canUseFollowUps: hasActiveAccess,
    canImportPdf: hasActiveAccess,
    canViewReports: hasActiveAccess,
    canUseTeamFeatures: hasActiveAccess,
  };
}
