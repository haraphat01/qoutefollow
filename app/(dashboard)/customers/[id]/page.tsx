import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Plus } from "lucide-react";

import { CustomerForm } from "@/components/customers/customer-form";
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
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCustomer, listCustomerQuotes } from "@/lib/queries/customers";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { id } = await params;
  const customer = await getCustomer(session.organization.id, id);
  if (!customer) {
    notFound();
  }

  const customerQuotes = await listCustomerQuotes(
    session.organization.id,
    customer.id,
  );
  const acceptedTotal = customerQuotes
    .filter((quote) => quote.status === "accepted")
    .reduce((sum, quote) => sum + Number(quote.amount), 0);

  return (
    <div className="space-y-7">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2">CUSTOMER</p>
          <h1 className="page-heading">{customer.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {customerQuotes.length} {customerQuotes.length === 1 ? "quote" : "quotes"} · {formatCurrency(acceptedTotal)} accepted
          </p>
        </div>
        <Button asChild size="lg" className="h-11 gap-2 self-start rounded-xl px-4 sm:self-auto">
          <Link href={`/quotes/new?customerId=${customer.id}`}><Plus className="size-4" /> New quote</Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="gap-0">
          <CardHeader className="pb-4">
            <CardTitle>Quote history</CardTitle>
            <CardDescription className="mt-1.5">Every estimate sent to this customer.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {customerQuotes.length === 0 ? (
              <div className="empty-state min-h-48">
                <span className="empty-state-icon"><FileText className="size-5" /></span>
                <p className="mt-3 text-sm text-muted-foreground">No quotes for this customer yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <Link href={`/quotes/${quote.id}`} className="font-semibold hover:text-primary">{quote.quoteNumber}</Link>
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">{quote.jobDescription}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(quote.amount)}</TableCell>
                      <TableCell><QuoteStatusBadge status={quote.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(quote.quoteDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle>Contact details</CardTitle>
            <CardDescription className="mt-1">Changes apply to future follow-ups on every quote for this customer.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <CustomerForm
              customer={{
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                notes: customer.notes,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
