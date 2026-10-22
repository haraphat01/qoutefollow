import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { normalizeSubscriptionPlan } from "@/lib/billing/plans";
import { planFromStripePriceId } from "@/lib/billing/stripe";

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): (typeof organizations.$inferInsert)["subscriptionStatus"] {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

async function updateOrganizationFromSubscription(
  subscription: Stripe.Subscription,
) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) {
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planFromMeta = subscription.metadata.plan;
  const fromPrice = priceId ? planFromStripePriceId(priceId) : null;
  const resolvedPlan = normalizeSubscriptionPlan(
    planFromMeta ?? fromPrice ?? "none",
  );

  await db
    .update(organizations)
    .set({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      subscriptionPlan: resolvedPlan,
      subscriptionStatus: mapSubscriptionStatus(subscription.status),
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (organizationId && customerId) {
        await db
          .update(organizations)
          .set({
            stripeCustomerId: customerId,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, organizationId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateOrganizationFromSubscription(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata.organizationId;
      if (!organizationId) {
        break;
      }

      await db
        .update(organizations)
        .set({
          subscriptionStatus: "canceled",
          subscriptionPlan: "none",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));
      break;
    }
    default:
      break;
  }

  return { received: true };
}
