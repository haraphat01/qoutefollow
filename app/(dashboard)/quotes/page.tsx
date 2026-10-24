import Link from "next/link";
import { ArrowRight, Download, Eye, FileText, FileUp, Plus } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listQuotes } from "@/lib/queries/quotes";
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/format";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "unassigned", label: "Unassigned" },
] as const;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { owner } = await searchParams;
  const filter = owner === "mine" || owner === "unassigned" ? owner : "all";
  const rows = await listQuotes(session.organization.id, {
    assignedTo: filter === "mine" ? session.user.id : filter === "unassigned" ? null : undefined,
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2">YOUR ESTIMATE PIPELINE</p>
          <h1 className="page-heading">Quotes</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Keep estimates, customers, and follow-up status in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button asChild size="lg" variant="outline" className="h-11 gap-2 rounded-xl bg-card px-4">
            <a href="/api/export/quotes"><Download className="size-4" /> Export CSV</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 gap-2 rounded-xl bg-card px-4">
            <Link href="/quotes/import"><FileUp className="size-4" /> Import PDF</Link>
          </Button>
          <Button asChild size="lg" className="h-11 gap-2 rounded-xl px-4">
            <Link href="/quotes/new"><Plus className="size-4" /> New quote</Link>
          </Button>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>{filter === "mine" ? "Your quotes" : filter === "unassigned" ? "Unassigned quotes" : "All quotes"}</CardTitle>
            <CardDescription className="mt-1.5">A complete view of estimates for your business.</CardDescription>
          </div>
          <nav aria-label="Filter quotes" className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-sm">
            {FILTERS.map((item) => (
              <Link
                key={item.id}
                href={item.id === "all" ? "/quotes" : `/quotes?owner=${item.id}`}
                aria-current={filter === item.id ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 font-medium ${filter === item.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {rows.length} {rows.length === 1 ? "quote" : "quotes"}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 && filter !== "all" ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No {filter === "mine" ? "quotes are assigned to you" : "unassigned quotes"} right now.</p>
          ) : rows.length === 0 ? (
            <div className="empty-state min-h-72">
              <span className="empty-state-icon"><FileText className="size-5" /></span>
              <h3 className="mt-4 text-sm font-semibold">Your quote list starts here</h3>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Add your first estimate to keep the details organized and set up a follow-up cadence.
              </p>
              <Button asChild className="mt-5">
                <Link href="/quotes/new">Create your first quote <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Date created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ quote, customerName, customerEmail, assigneeName }) => (
                  <TableRow key={quote.id} className="group">
                    <TableCell>
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary"
                      >
                        {quote.quoteNumber}
                        <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{customerName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{customerEmail}</div>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">{formatCurrency(quote.amount)}</TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.status} />
                      {quote.viewCount > 0 && !quote.acceptedAt ? (
                        <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Eye className="size-3" /> Viewed {quote.viewCount}×</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{assigneeName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(quote.quoteDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
