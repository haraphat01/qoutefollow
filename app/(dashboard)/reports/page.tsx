import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getOrganizationEntitlements } from "@/lib/billing/organization";
import { formatCurrency } from "@/lib/format";
import { ReportsIntelligenceSection } from "@/components/reports/intelligence-section";
import { getOrganizationIntelligence } from "@/lib/queries/intelligence";
import { getOrganizationReport } from "@/lib/queries/reports";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const billing = await getOrganizationEntitlements(session.organization.id);
  if (!billing?.entitlements.canViewReports) {
    return (
      <div className="space-y-4">
        <h1 className="page-heading">Reports</h1>
        <Card>
          <CardHeader>
            <CardTitle>Subscription required</CardTitle>
            <CardDescription>
              Subscribe (or finish your trial) to unlock quote outcomes,
              follow-up activity, and confirmed revenue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/billing"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View plans
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [report, intelligence] = await Promise.all([
    getOrganizationReport(session.organization.id, 30),
    getOrganizationIntelligence(session.organization.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">PERFORMANCE</p>
        <h1 className="page-heading">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last {report.periodDays} days for {session.organization.name}.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmed revenue</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(report.acceptedRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {report.acceptedCount} accepted quotes
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win rate</CardDescription>
            <CardTitle className="text-3xl">
              {Math.round(report.winRate * 100)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Accepted vs declined decisions
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Follow-ups sent</CardDescription>
            <CardTitle className="text-3xl">{report.emailsSent}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {report.emailsFailed} failed deliveries
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open pipeline</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(report.openPipelineValue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {report.openPipelineCount} open quotes
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Intelligence</CardTitle>
          <CardDescription>
            Reply timing, follow-up effectiveness, and AI reply labels (90-day
            window).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsIntelligenceSection
            medianReplyHours={intelligence.medianReplyHours}
            acceptedAfterSecondFollowUpRate={
              intelligence.acceptedAfterSecondFollowUpRate
            }
            acceptedWithTwoPlusFollowUps={
              intelligence.acceptedWithTwoPlusFollowUps
            }
            acceptedTotal={intelligence.acceptedTotal}
            staleOpenQuotes={intelligence.staleOpenQuotes}
            replyClassifications={intelligence.replyClassifications}
            sampleReplyCount={intelligence.sampleReplyCount}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quote outcomes</CardTitle>
          <CardDescription>Activity in the reporting window</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <p>Accepted: {report.outcomes.accepted}</p>
          <p>Declined: {report.outcomes.declined}</p>
          <p>Still open: {report.outcomes.pending}</p>
        </CardContent>
      </Card>
    </div>
  );
}
