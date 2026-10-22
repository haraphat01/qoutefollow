import type { organizations } from "@/lib/db/schema";

import { PLAN_CATALOG, normalizeSubscriptionPlan } from "./plans";

export function formatPlanLabel(
  plan: (typeof organizations.$inferSelect)["subscriptionPlan"],
) {
  const normalized = normalizeSubscriptionPlan(plan);
  if (normalized === "none") {
    return "No plan";
  }
  return PLAN_CATALOG.starter.name;
}

export function formatSubscriptionStatus(
  status: (typeof organizations.$inferSelect)["subscriptionStatus"],
) {
  switch (status) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    default:
      return "Not subscribed";
  }
}

export function statusBadgeVariant(
  status: (typeof organizations.$inferSelect)["subscriptionStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "trialing":
      return "default";
    case "past_due":
      return "destructive";
    case "canceled":
      return "outline";
    default:
      return "secondary";
  }
}
