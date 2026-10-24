import { BillingAlerts } from "@/components/billing/billing-alerts";
import { BillingPortalActions } from "@/components/billing/billing-portal-actions";
import { InvoiceList } from "@/components/billing/invoice-list";
import { PlanPicker } from "@/components/billing/plan-picker";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getCustomerBillingSummary } from "@/lib/billing/customer-summary";
import {
  formatPlanLabel,
  formatSubscriptionStatus,
  statusBadgeVariant,
} from "@/lib/billing/labels";
import { getOrganizationEntitlements } from "@/lib/billing/organization";
import { hasPaidSubscription, isStripeConfigured, trialDaysLeft } from "@/lib/billing/entitlements";
import { formatCurrency, formatDate } from "@/lib/format";

/** Stripe Checkout needs a trial end at least 48 hours away to carry it over. */
function keepsTrialOnUpgrade(trialEndsAt: Date) {
  return trialEndsAt.getTime() - Date.now() >= 48 * 60 * 60 * 1000;
}

function trialDaysRemaining(trialEndsAt: Date | null) {
  if (!trialEndsAt) {
    return null;
  }
  const ms = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; portal?: string }>;
}) {
  const query = await searchParams;
  const session = await getSession();
  if (!session) {
    return null;
  }

  const billing = await getOrganizationEntitlements(session.organization.id);
  if (!billing) {
    return null;
  }

  const { org, entitlements } = billing;
  const stripeReady = isStripeConfigured();
  const isOwner = session.role === "owner";

  const stripeSummary =
    stripeReady && org.stripeCustomerId
      ? await getCustomerBillingSummary(org.stripeCustomerId).catch(() => null)
      : null;

  const hasActiveSubscription = hasPaidSubscription(org);
  const onFreeTrial = trialDaysLeft({
    plan: org.subscriptionPlan,
    status: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt,
    stripeSubscriptionId: org.stripeSubscriptionId,
  }) !== null;

  const trialDays = trialDaysRemaining(org.trialEndsAt);
  const renewalDate =
    stripeSummary?.subscription?.currentPeriodEnd ?? org.trialEndsAt;

  return (
    <div className="space-y-8">
      <BillingAlerts checkout={query.checkout} portal={query.portal} />

      <div>
        <p className="eyebrow mb-2">SUBSCRIPTION</p>
        <h1 className="page-heading">Billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your plan, payment method, and invoices through Stripe’s secure
          customer portal.
        </p>
      </div>

      {!isOwner ? (
        <Card className="border-amber-500/30 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base">Owner access required</CardTitle>
            <CardDescription>
              Only the account owner can change plans or open the Stripe billing
              portal. Ask {session.organization.name}&apos;s owner to manage
              billing.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Current plan</CardTitle>
            <CardDescription className="mt-1.5">
              {entitlements.pilotMode
                ? "Pilot mode — all features enabled without Stripe."
                : "Synced from Stripe when webhooks are configured."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(org.subscriptionStatus)}>
              {formatSubscriptionStatus(org.subscriptionStatus)}
            </Badge>
            <Badge variant="outline">{formatPlanLabel(org.subscriptionPlan)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            {org.trialEndsAt && org.subscriptionStatus === "trialing" ? (
              <div>
                <dt className="text-muted-foreground">Trial</dt>
                <dd className="font-medium">
                  {trialDays !== null ? `${trialDays} days left` : "—"} · ends{" "}
                  {formatDate(org.trialEndsAt)}
                </dd>
              </div>
            ) : null}
            {renewalDate ? (
              <div>
                <dt className="text-muted-foreground">
                  {stripeSummary?.subscription?.cancelAtPeriodEnd
                    ? "Access until"
                    : "Next renewal"}
                </dt>
                <dd className="font-medium">{formatDate(renewalDate)}</dd>
              </div>
            ) : null}
            {stripeSummary?.defaultPaymentMethod?.last4 ? (
              <div>
                <dt className="text-muted-foreground">Payment method</dt>
                <dd className="font-medium capitalize">
                  {stripeSummary.defaultPaymentMethod.brand}{" "}
                  ···· {stripeSummary.defaultPaymentMethod.last4}
                  {stripeSummary.defaultPaymentMethod.expMonth
                    ? ` · exp ${stripeSummary.defaultPaymentMethod.expMonth}/${stripeSummary.defaultPaymentMethod.expYear}`
                    : null}
                </dd>
              </div>
            ) : null}
            {stripeSummary?.subscription?.unitAmount ? (
              <div>
                <dt className="text-muted-foreground">Recurring charge</dt>
                <dd className="font-medium">
                  {formatCurrency(stripeSummary.subscription.unitAmount / 100)}
                  /{stripeSummary.subscription.interval ?? "month"}
                </dd>
              </div>
            ) : null}
          </dl>

          {stripeSummary?.subscription?.cancelAtPeriodEnd ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-amber-950">
              Your subscription is set to cancel at the end of the current billing
              period. Use Manage in Stripe to reactivate.
            </p>
          ) : null}

          <ul className="grid gap-1 text-muted-foreground sm:grid-cols-3">
            <li>Follow-ups: {entitlements.canUseFollowUps ? "Included" : "—"}</li>
            <li>PDF import: {entitlements.canImportPdf ? "Included" : "—"}</li>
            <li>Reports: {entitlements.canViewReports ? "Included" : "—"}</li>
          </ul>

          {isOwner && stripeReady ? (
            <BillingPortalActions
              hasCustomer={Boolean(org.stripeCustomerId)}
              hasSubscription={hasActiveSubscription}
            />
          ) : null}
        </CardContent>
      </Card>

      {isOwner && stripeReady && org.stripeCustomerId ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>
              Hosted receipts open on Stripe. PDF downloads are available from the
              portal when enabled in your Stripe billing settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceList invoices={stripeSummary?.invoices ?? []} />
          </CardContent>
        </Card>
      ) : null}

      {isOwner && stripeReady ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Plan</h2>
          <PlanPicker
            hasActiveSubscription={hasActiveSubscription}
            freeTrial={
              onFreeTrial && org.trialEndsAt
                ? {
                    endsOn: formatDate(org.trialEndsAt),
                    keepsTrial: keepsTrialOnUpgrade(org.trialEndsAt),
                  }
                : null
            }
          />
        </div>
      ) : null}

      {!stripeReady ? (
        <Card>
          <CardHeader>
            <CardTitle>Stripe setup</CardTitle>
            <CardDescription>
              Add Stripe keys to `.env.local`, create a{" "}
              <a
                href="https://dashboard.stripe.com/settings/billing/portal"
                className="font-semibold text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Customer Portal configuration
              </a>
              , and set `STRIPE_PORTAL_CONFIGURATION_ID` so contractors can
              update payment methods, switch plans, and download invoices.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
