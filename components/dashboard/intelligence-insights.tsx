import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function IntelligenceInsights({
  medianReplyHours,
  acceptedAfterSecondFollowUpRate,
  acceptedWithTwoPlusFollowUps,
  acceptedTotal,
  staleOpenQuotes,
}: {
  medianReplyHours: number | null;
  acceptedAfterSecondFollowUpRate: number | null;
  acceptedWithTwoPlusFollowUps: number;
  acceptedTotal: number;
  staleOpenQuotes: number;
}) {
  const medianLabel =
    medianReplyHours === null
      ? "—"
      : medianReplyHours < 48
        ? `${Math.round(medianReplyHours)}h`
        : `${Math.round(medianReplyHours / 24)}d`;

  const followUpWinLabel =
    acceptedAfterSecondFollowUpRate === null
      ? "—"
      : `${Math.round(acceptedAfterSecondFollowUpRate * 100)}%`;

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Intelligence</CardTitle>
          <CardDescription className="mt-1">
            Reply timing and follow-up effectiveness (last 90 days).
          </CardDescription>
        </div>
        <Link
          href="/reports"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Full reports
        </Link>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3 pt-0">
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Median time to reply
          </p>
          <p className="mt-2 text-2xl font-semibold">{medianLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            First customer reply after first follow-up
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Won after 2+ emails
          </p>
          <p className="mt-2 text-2xl font-semibold">{followUpWinLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {acceptedWithTwoPlusFollowUps} of {acceptedTotal} accepted quotes
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Stale open quotes
          </p>
          <p className="mt-2 text-2xl font-semibold">{staleOpenQuotes}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open 7+ days without a decision
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
