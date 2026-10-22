import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

import { resolveEntitlements, type Entitlements } from "./entitlements";

export async function getOrganizationBilling(organizationId: string) {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      stripeCustomerId: organizations.stripeCustomerId,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
      subscriptionPlan: organizations.subscriptionPlan,
      subscriptionStatus: organizations.subscriptionStatus,
      trialEndsAt: organizations.trialEndsAt,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org ?? null;
}

export async function getOrganizationEntitlements(organizationId: string) {
  const org = await getOrganizationBilling(organizationId);
  if (!org) {
    return null;
  }

  const entitlements = resolveEntitlements({
    plan: org.subscriptionPlan,
    status: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt,
  });

  return { org, entitlements };
}

export function assertEntitlement(
  entitlements: Entitlements,
  feature: keyof Pick<
    Entitlements,
    "canImportPdf" | "canViewReports" | "canUseFollowUps" | "canUseTeamFeatures"
  >,
) {
  if (!entitlements[feature]) {
    throw new Error("PLAN_REQUIRED");
  }
}
