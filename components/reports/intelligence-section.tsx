import { formatClassificationLabel } from "@/lib/replies/classification-labels";

export function ReportsIntelligenceSection({
  medianReplyHours,
  acceptedAfterSecondFollowUpRate,
  acceptedWithTwoPlusFollowUps,
  acceptedTotal,
  staleOpenQuotes,
  replyClassifications,
  sampleReplyCount,
}: {
  medianReplyHours: number | null;
  acceptedAfterSecondFollowUpRate: number | null;
  acceptedWithTwoPlusFollowUps: number;
  acceptedTotal: number;
  staleOpenQuotes: number;
  replyClassifications: Record<string, number>;
  sampleReplyCount: number;
}) {
  const medianLabel =
    medianReplyHours === null
      ? "—"
      : medianReplyHours < 48
        ? `${Math.round(medianReplyHours)} hours`
        : `${Math.round(medianReplyHours / 24)} days`;

  const followUpWinLabel =
    acceptedAfterSecondFollowUpRate === null
      ? "—"
      : `${Math.round(acceptedAfterSecondFollowUpRate * 100)}%`;

  const classificationEntries = Object.entries(replyClassifications).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/70 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Median reply time
          </p>
          <p className="mt-2 text-2xl font-semibold">{medianLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sampleReplyCount} quotes with a measured first reply
          </p>
        </div>
        <div className="rounded-xl border border-border/70 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Accepted after 2+ follow-ups
          </p>
          <p className="mt-2 text-2xl font-semibold">{followUpWinLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {acceptedWithTwoPlusFollowUps} of {acceptedTotal} wins
          </p>
        </div>
        <div className="rounded-xl border border-border/70 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Stale open quotes
          </p>
          <p className="mt-2 text-2xl font-semibold">{staleOpenQuotes}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open 7+ days without a decision
          </p>
        </div>
      </div>

      {classificationEntries.length > 0 ? (
        <div>
          <p className="text-sm font-semibold">Reply intent (AI-labeled)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Inbound messages classified in the last 90 days.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {classificationEntries.map(([key, count]) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
              >
                <span>{formatClassificationLabel(key) ?? key}</span>
                <span className="font-semibold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Reply intent breakdown appears after customers reply and{" "}
          <code className="text-xs">OPENAI_API_KEY</code> is configured for
          classification.
        </p>
      )}
    </div>
  );
}
