import { formatDateTime } from "@/lib/format";
import type { QuoteEmailAuditEntry } from "@/lib/queries/quote-email-audit";

export function QuoteEmailAudit({
  entries,
  timeZone,
}: {
  entries: QuoteEmailAuditEntry[];
  timeZone: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No email activity logged yet. Sent follow-ups and delivery events appear
        here for your records.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3 last:border-0"
        >
          <div>
            <p className="text-sm font-medium">{entry.label}</p>
            {entry.detail ? (
              <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>
            ) : null}
          </div>
          <time
            className="text-xs text-muted-foreground"
            dateTime={entry.at.toISOString()}
          >
            {formatDateTime(entry.at, timeZone)}
          </time>
        </li>
      ))}
    </ul>
  );
}
