import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { trialDaysLeft } from "@/lib/billing/entitlements";
import { getOrganizationEntitlements } from "@/lib/billing/organization";

export const instant = false;

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    // Clears a stale cookie first; otherwise the proxy bounces /login back here.
    redirect("/api/auth/clear-session");
  }
  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }

  // Owners see how long the free trial has left, or that it has ended.
  let trialNotice: { daysLeft: number } | { ended: true } | null = null;
  if (session.role === "owner") {
    const billing = await getOrganizationEntitlements(session.organization.id);
    if (billing && !billing.entitlements.pilotMode) {
      const daysLeft = trialDaysLeft({
        plan: billing.org.subscriptionPlan,
        status: billing.org.subscriptionStatus,
        trialEndsAt: billing.org.trialEndsAt,
        stripeSubscriptionId: billing.org.stripeSubscriptionId,
      });
      if (!billing.entitlements.hasActiveAccess) {
        trialNotice = { ended: true };
      } else if (daysLeft !== null) {
        trialNotice = { daysLeft };
      }
    }
  }

  return (
    <AppShell session={session} isAdmin={isAdminEmail(session.user.email)} trialNotice={trialNotice}>
      {children}
    </AppShell>
  );
}
