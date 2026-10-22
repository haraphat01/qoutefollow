import type Stripe from "stripe";

import { appUrl, getStripe } from "./stripe";

type PortalFlow =
  | { type: "default" }
  | { type: "payment_method_update" }
  | {
      type: "subscription_update";
      subscriptionId: string;
    }
  | {
      type: "subscription_cancel";
      subscriptionId: string;
    };

function portalConfigurationId() {
  return process.env.STRIPE_PORTAL_CONFIGURATION_ID;
}

export async function createPortalSession(
  customerId: string,
  flow: PortalFlow = { type: "default" },
) {
  const stripe = getStripe();
  const configuration = portalConfigurationId();

  const base: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: appUrl("/settings/billing?portal=returned"),
    ...(configuration ? { configuration } : {}),
  };

  if (flow.type === "payment_method_update") {
    return stripe.billingPortal.sessions.create({
      ...base,
      flow_data: {
        type: "payment_method_update",
      },
    });
  }

  if (flow.type === "subscription_update") {
    return stripe.billingPortal.sessions.create({
      ...base,
      flow_data: {
        type: "subscription_update",
        subscription_update: {
          subscription: flow.subscriptionId,
        },
      },
    });
  }

  if (flow.type === "subscription_cancel") {
    return stripe.billingPortal.sessions.create({
      ...base,
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: flow.subscriptionId,
        },
      },
    });
  }

  return stripe.billingPortal.sessions.create(base);
}
