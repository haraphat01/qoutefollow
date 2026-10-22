import { describe, expect, it } from "vitest";

import { resolveEntitlements } from "@/lib/billing/entitlements";

describe("resolveEntitlements", () => {
  it("enables all features in pilot mode when Stripe is unset", () => {
    const previous = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const entitlements = resolveEntitlements({
      plan: "none",
      status: "none",
      trialEndsAt: null,
    });

    expect(entitlements.pilotMode).toBe(true);
    expect(entitlements.canImportPdf).toBe(true);
    expect(entitlements.canViewReports).toBe(true);

    process.env.STRIPE_SECRET_KEY = previous;
  });

  it("includes all features on active starter subscription", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";

    const entitlements = resolveEntitlements({
      plan: "starter",
      status: "active",
      trialEndsAt: null,
    });

    expect(entitlements.canUseFollowUps).toBe(true);
    expect(entitlements.canImportPdf).toBe(true);
    expect(entitlements.canViewReports).toBe(true);

    delete process.env.STRIPE_SECRET_KEY;
  });

  it("includes all features during active trial", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";

    const entitlements = resolveEntitlements({
      plan: "starter",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 86_400_000),
    });

    expect(entitlements.canImportPdf).toBe(true);
    expect(entitlements.canViewReports).toBe(true);

    delete process.env.STRIPE_SECRET_KEY;
  });

  it("keeps legacy growth subscribers on full access", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";

    const entitlements = resolveEntitlements({
      plan: "growth",
      status: "active",
      trialEndsAt: null,
    });

    expect(entitlements.canImportPdf).toBe(true);
    expect(entitlements.canViewReports).toBe(true);

    delete process.env.STRIPE_SECRET_KEY;
  });
});
