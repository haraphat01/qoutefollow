import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, organizations, quotes, users } from "@/lib/db/schema";
import { lineTotal } from "@/lib/quotes/line-items";
import { computeTotals, type PricingTotals, type QuotePricing } from "@/lib/quotes/pricing";
import { loadQuotePricing } from "@/lib/quotes/save-line-items";

export type QuoteDocumentOption = {
  id: string | null;
  name: string | null;
  items: { id: string; description: string; quantity: number; unitPrice: number; amount: number }[];
  totals: PricingTotals;
};

export type QuoteDocument = {
  quote: typeof quotes.$inferSelect;
  customer: typeof customers.$inferSelect;
  organization: typeof organizations.$inferSelect;
  assignee: { id: string; name: string; email: string } | null;
  options: QuoteDocumentOption[];
  discount: QuotePricing["discount"];
  taxRate: number;
  /** Index into `options` of the accepted option, if the customer chose one. */
  acceptedOptionIndex: number | null;
};

/** Everything needed to show, print or email a quote. */
export async function loadQuoteDocument(
  where: { organizationId: string; quoteId: string } | { publicToken: string },
): Promise<QuoteDocument | null> {
  const condition =
    "publicToken" in where
      ? eq(quotes.publicToken, where.publicToken)
      : and(eq(quotes.id, where.quoteId), eq(quotes.organizationId, where.organizationId));

  const [row] = await db
    .select({ quote: quotes, customer: customers, organization: organizations })
    .from(quotes)
    .innerJoin(customers, eq(customers.id, quotes.customerId))
    .innerJoin(organizations, eq(organizations.id, quotes.organizationId))
    .where(condition)
    .limit(1);
  if (!row) {
    return null;
  }

  const [pricing, assignee] = await Promise.all([
    loadQuotePricing(row.quote),
    row.quote.assignedUserId
      ? db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, row.quote.assignedUserId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const options = pricing.options.map((option) => ({
    id: option.id,
    name: option.name,
    items: option.items.map((item) => ({ ...item, amount: lineTotal(item) })),
    totals: computeTotals(option.items, pricing.discount, pricing.taxRate),
  }));
  const acceptedIndex = row.quote.acceptedOptionId
    ? options.findIndex((option) => option.id === row.quote.acceptedOptionId)
    : -1;

  return {
    ...row,
    assignee,
    options,
    discount: pricing.discount,
    taxRate: pricing.taxRate,
    acceptedOptionIndex: acceptedIndex >= 0 ? acceptedIndex : null,
  };
}

/** The editor's starting state for an existing quote or template. */
export function toPricingDraft(document: Pick<QuoteDocument, "options" | "discount" | "taxRate">) {
  return {
    options: document.options.map((option) => ({
      name: option.name,
      items: option.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })),
    discount: document.discount,
    taxRate: document.taxRate,
  };
}
