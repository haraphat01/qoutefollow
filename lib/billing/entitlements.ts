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
