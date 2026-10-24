import type { WinRateRow, getWinRateReport } from "@/lib/queries/win-rates";
import { formatCurrency } from "@/lib/format";

type Report = Awaited<ReturnType<typeof getWinRateReport>>;

function pct(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function BreakdownTable({ title, rows }: { title: string; rows: WinRateRow[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No quotes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium" />
                <th className="px-3 py-2 text-right font-medium">Quotes</th>
                <th className="px-3 py-2 text-right font-medium">Won</th>
                <th className="px-3 py-2 text-right font-medium">Win rate</th>
                <th className="px-3 py-2 text-right font-medium">Won value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="max-w-48 truncate px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.quotes}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.won}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:inline-block">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((row.winRate ?? 0) * 100)}%` }} />
                      </span>
                      <span className="tabular-nums">{pct(row.winRate)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.wonValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function WinRateSection({ report }: { report: Report }) {
  const maxCreated = Math.max(1, ...report.monthly.map((month) => month.created));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Win rate", pct(report.overall.winRate)],
          ["Won", `${report.overall.won} of ${report.overall.won + report.overall.lost} decided`],
          ["Revenue won", formatCurrency(report.overall.wonValue)],
          ["Avg. time to close", report.avgDaysToClose === null ? "—" : `${report.avgDaysToClose.toFixed(1)} days`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">By month</h3>
        <div className="grid grid-cols-6 items-end gap-2" aria-label="Quotes created and won per month">
          {report.monthly.map((month) => (
            <div key={month.label} className="flex flex-col items-center gap-1 text-xs">
              <div className="flex h-28 w-full items-end justify-center gap-1">
                <span className="w-1/3 rounded-t bg-muted-foreground/25" style={{ height: `${(month.created / maxCreated) * 100}%` }} title={`${month.created} created`} />
                <span className="w-1/3 rounded-t bg-primary" style={{ height: `${(month.won / maxCreated) * 100}%` }} title={`${month.won} won`} />
              </div>
              <span className="text-muted-foreground">{month.label}</span>
              <span className="font-medium tabular-nums">{month.won}/{month.created}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-muted-foreground/25" /> Created</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> Won</span>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownTable title="By job type" rows={report.byJobType} />
        <BreakdownTable title="By salesperson" rows={report.bySalesperson} />
        <BreakdownTable title="By quote size" rows={report.byAmount} />
      </div>
      <p className="text-xs text-muted-foreground">
        Quotes created in the last {report.months} months. Win rate = accepted ÷ (accepted + declined, expired or cancelled).
      </p>
    </div>
  );
}
