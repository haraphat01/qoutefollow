import type { BillingInvoice } from "@/lib/billing/customer-summary";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatInvoiceAmount(amountCents: number, currency: string) {
  const value = amountCents / 100;
  if (currency.toLowerCase() === "usd") {
    return formatCurrency(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}

export function InvoiceList({ invoices }: { invoices: BillingInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No invoices yet. Your first invoice appears after checkout.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Receipt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>{formatDate(invoice.created)}</TableCell>
            <TableCell>{invoice.number ?? invoice.id.slice(-8)}</TableCell>
            <TableCell className="capitalize">{invoice.status ?? "—"}</TableCell>
            <TableCell className="text-right">
              {formatInvoiceAmount(invoice.amountDue, invoice.currency)}
            </TableCell>
            <TableCell className="text-right">
              {invoice.hostedInvoiceUrl ? (
                <a
                  href={invoice.hostedInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  View
                </a>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
