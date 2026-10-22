import Link from "next/link";
import { ArrowRight, FileText, FileUp, Plus } from "lucide-react";

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

export default async function QuotesPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const rows = await listQuotes(session.organization.id);

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
            <Link href="/quotes/import"><FileUp className="size-4" /> Import PDF</Link>
          </Button>
          <Button asChild size="lg" className="h-11 gap-2 rounded-xl px-4">
            <Link href="/quotes/new"><Plus className="size-4" /> New quote</Link>
          </Button>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>All quotes</CardTitle>
            <CardDescription className="mt-1.5">A complete view of estimates for your business.</CardDescription>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {rows.length} {rows.length === 1 ? "quote" : "quotes"}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
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
                  <TableHead>Date created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ quote, customerName, customerEmail }) => (
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
                    <TableCell><QuoteStatusBadge status={quote.status} /></TableCell>
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
