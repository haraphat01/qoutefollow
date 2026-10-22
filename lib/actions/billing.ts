"use server";

import { requireSession } from "@/lib/auth/session";
import { createPortalSession } from "@/lib/billing/portal";
import { getOrganizationBilling } from "@/lib/billing/organization";
import type { PlanId } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/entitlements";
import { createCheckoutSession } from "@/lib/billing/stripe";

type BillingActionResult = { url?: string; error?: string };

function requireOwner(session: { role: string }) {
  if (session.role !== "owner") {
    return "Only the account owner can manage billing.";
  }
  return null;
}

async function portalUrlForOwner(
  flow:
    | { type: "default" }
    | { type: "payment_method_update" }
    | { type: "subscription_update" }
    | { type: "subscription_cancel" },
): Promise<BillingActionResult> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const ownerError = requireOwner(session);
  if (ownerError) {
    return { error: ownerError };
  }

  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const org = await getOrganizationBilling(session.organization.id);
  if (!org?.stripeCustomerId) {
    return { error: "No billing account yet. Choose a plan below first." };
  }

  if (
    (flow.type === "subscription_update" ||
      flow.type === "subscription_cancel") &&
    !org.stripeSubscriptionId
  ) {
    return { error: "No active subscription found." };
  }

  const portal = await createPortalSession(
    org.stripeCustomerId,
    flow.type === "subscription_update"
      ? {
          type: "subscription_update",
          subscriptionId: org.stripeSubscriptionId!,
        }
      : flow.type === "subscription_cancel"
        ? {
            type: "subscription_cancel",
            subscriptionId: org.stripeSubscriptionId!,
          }
        : flow,
  );

  if (!portal.url) {
    return { error: "Could not open the billing portal." };
  }

  return { url: portal.url };
}

export async function startCheckoutAction(
  plan: PlanId,
): Promise<BillingActionResult> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const ownerError = requireOwner(session);
  if (ownerError) {
    return { error: ownerError };
  }

  if (!isStripeConfigured()) {
    return {
      error: "Stripe is not configured. Pilot mode is active for all features.",
    };
  }

  const org = await getOrganizationBilling(session.organization.id);
  if (!org) {
    return { error: "Organization not found." };
  }

  if (org.stripeSubscriptionId && org.subscriptionStatus === "active") {
    return {
      error:
        "You already have an active subscription. Use “Change plan” to switch in the Stripe portal.",
    };
  }

  const checkout = await createCheckoutSession({
    customerId: org.stripeCustomerId,
    customerEmail: session.user.email,
    organizationId: session.organization.id,
    plan,
  });

  if (!checkout.url) {
    return { error: "Could not start checkout." };
  }

  return { url: checkout.url };
}

export async function openBillingPortalAction(): Promise<BillingActionResult> {
  return portalUrlForOwner({ type: "default" });
}

export async function openPaymentMethodPortalAction(): Promise<BillingActionResult> {
  return portalUrlForOwner({ type: "payment_method_update" });
}

export async function openChangePlanPortalAction(): Promise<BillingActionResult> {
  return portalUrlForOwner({ type: "subscription_update" });
}

export async function openCancelSubscriptionPortalAction(): Promise<BillingActionResult> {
  return portalUrlForOwner({ type: "subscription_cancel" });
}
