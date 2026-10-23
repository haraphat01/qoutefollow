import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { QuoteEditForm } from "@/components/quotes/quote-edit-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { toDateInputValue } from "@/lib/format";
import { getQuoteDetail } from "@/lib/queries/quotes";
import { listQuoteLineItems } from "@/lib/quotes/save-line-items";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { id } = await params;
  const detail = await getQuoteDetail(session.organization.id, id);
  if (!detail) {
    notFound();
  }

  const { quote, customer } = detail;
  const items = await listQuoteLineItems(quote.id);
  // Quotes created before itemizing become a single line for their amount.
  const lineItems =
    items.length > 0
      ? items
      : [{ description: quote.jobDescription.slice(0, 300), quantity: 1, unitPrice: Number(quote.amount) }];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/quotes/${quote.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> {quote.quoteNumber}
      </Link>
      <div>
        <p className="eyebrow mb-2">QUOTE PIPELINE</p>
        <h1 className="page-heading">Edit {quote.quoteNumber}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          For {customer.name}. To change contact details, edit the{" "}
          <Link href={`/customers/${customer.id}`} className="font-semibold text-primary hover:underline">customer</Link>.
        </p>
      </div>
      <Card className="gap-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle>Estimate details</CardTitle>
          <CardDescription className="mt-1">Follow-up emails use the updated details from their next send.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <QuoteEditForm
            quote={{
              id: quote.id,
              lineItems,
              jobDescription: quote.jobDescription,
              quoteDate: toDateInputValue(quote.quoteDate),
              expiresAt: toDateInputValue(quote.expiresAt),
              notes: quote.notes ?? "",
              followUpsEnabled: quote.followUpsEnabled,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
