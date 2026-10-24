import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn(async (params: unknown) => ({ url: "https://checkout.stripe.test", params }));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create } };
  },
}));

import { TRIAL_DAYS } from "@/lib/billing/plans";
import { hasPaidSubscription, trialDaysLeft } from "@/lib/billing/entitlements";
import { createCheckoutSession } from "@/lib/billing/stripe";

const DAY = 24 * 60 * 60 * 1000;

describe("free trial and early upgrade", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    create.mockClear();
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("is a 7-day trial", () => {
    expect(TRIAL_DAYS).toBe(7);
  });

  it("counts trial days left only while on the free trial", () => {
    const base = { plan: "starter" as const, status: "trialing" as const, stripeSubscriptionId: null };
    expect(trialDaysLeft({ ...base, trialEndsAt: new Date(Date.now() + 3.2 * DAY) })).toBe(4);
    expect(trialDaysLeft({ ...base, trialEndsAt: new Date(Date.now() + 3.2 * DAY), stripeSubscriptionId: "sub_1" })).toBeNull();
    expect(trialDaysLeft({ ...base, status: "active", trialEndsAt: null })).toBeNull();
  });

  it("treats an early upgrade (subscription still in trial) as subscribed", () => {
    expect(hasPaidSubscription({ stripeSubscriptionId: "sub_1", subscriptionStatus: "trialing" })).toBe(true);
    expect(hasPaidSubscription({ stripeSubscriptionId: null, subscriptionStatus: "trialing" })).toBe(false);
    expect(hasPaidSubscription({ stripeSubscriptionId: "sub_1", subscriptionStatus: "canceled" })).toBe(false);
  });

  it("carries the rest of the trial into checkout when 48h+ remain", async () => {
    const trialEndsAt = new Date(Date.now() + 5 * DAY);
    await createCheckoutSession({ customerEmail: "a@b.co", organizationId: "org", plan: "starter", trialEndsAt });
    const params = create.mock.calls[0][0] as { subscription_data: { trial_end?: number } };
    expect(params.subscription_data.trial_end).toBe(Math.floor(trialEndsAt.getTime() / 1000));
  });

  it("starts billing now when the trial ends within 48 hours or isn't given", async () => {
    await createCheckoutSession({ customerEmail: "a@b.co", organizationId: "org", plan: "starter", trialEndsAt: new Date(Date.now() + DAY) });
    await createCheckoutSession({ customerEmail: "a@b.co", organizationId: "org", plan: "starter" });
    for (const [params] of create.mock.calls as [{ subscription_data: { trial_end?: number } }][]) {
      expect(params.subscription_data.trial_end).toBeUndefined();
    }
  });
});

describe("ended trials", () => {
  it("aren't counted as a trial with days left", () => {
    expect(trialDaysLeft({ plan: "starter", status: "trialing", stripeSubscriptionId: null, trialEndsAt: new Date(Date.now() - 1000) })).toBeNull();
  });
});
