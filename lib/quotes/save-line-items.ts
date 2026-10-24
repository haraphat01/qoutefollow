import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quoteLineItems, quoteOptions, quotes } from "@/lib/db/schema";
import type { QuotePricing } from "@/lib/quotes/pricing";

type Executor = Pick<typeof db, "delete" | "insert">;

/**
 * Replace a quote's options and items. The caller stores the discount, tax
 * and amount on the quote row itself.
 */
export async function saveQuotePricing(
  executor: Executor,
  input: { organizationId: string; quoteId: string; pricing: QuotePricing },
) {
  await executor.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, input.quoteId));
  await executor.delete(quoteOptions).where(eq(quoteOptions.quoteId, input.quoteId));

  const named = input.pricing.options.length > 1;
  for (const [optionIndex, option] of input.pricing.options.entries()) {
    let optionId: string | null = null;
    if (named) {
      const [row] = await executor
        .insert(quoteOptions)
        .values({
          organizationId: input.organizationId,
          quoteId: input.quoteId,
          name: option.name ?? `Option ${optionIndex + 1}`,
          sortOrder: optionIndex,
        })
        .returning({ id: quoteOptions.id });
      optionId = row.id;
    }
    await executor.insert(quoteLineItems).values(
      option.items.map((item, index) => ({
        organizationId: input.organizationId,
        quoteId: input.quoteId,
        optionId,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        sortOrder: index,
      })),
    );
  }
}

/** Columns of the quote row that pricing needs. */
export function pricingColumns(pricing: QuotePricing, amount: number) {
  return {
    amount: amount.toFixed(2),
    discountType: pricing.discount?.type ?? null,
    discountValue: (pricing.discount?.value ?? 0).toFixed(2),
    taxRate: pricing.taxRate.toFixed(3),
  };
}

export type LoadedOption = {
  id: string | null;
  name: string | null;
  items: { id: string; description: string; quantity: number; unitPrice: number }[];
};

/**
 * A quote's stored pricing. Quotes from before itemizing come back as a single
 * item for their amount, so every quote can be shown and edited the same way.
 */
export async function loadQuotePricing(
  quote: Pick<
    typeof quotes.$inferSelect,
    "id" | "amount" | "jobDescription" | "discountType" | "discountValue" | "taxRate"
  >,
): Promise<{ options: LoadedOption[]; discount: QuotePricing["discount"]; taxRate: number }> {
  const [options, items] = await Promise.all([
    db.select().from(quoteOptions).where(eq(quoteOptions.quoteId, quote.id)).orderBy(asc(quoteOptions.sortOrder)),
    db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quote.id)).orderBy(asc(quoteLineItems.sortOrder)),
  ]);

  const toItem = (row: typeof quoteLineItems.$inferSelect) => ({
    id: row.id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
  });

  const loaded: LoadedOption[] =
    options.length > 0
      ? options.map((option) => ({
          id: option.id,
          name: option.name,
          items: items.filter((item) => item.optionId === option.id).map(toItem),
        }))
      : [
          {
            id: null,
            name: null,
            items:
              items.length > 0
                ? items.map(toItem)
                : [{ id: "legacy", description: quote.jobDescription.slice(0, 300), quantity: 1, unitPrice: Number(quote.amount) }],
          },
        ];

  const discountValue = Number(quote.discountValue);
  return {
    options: loaded,
    discount:
      quote.discountType === "percent" || quote.discountType === "amount"
        ? discountValue > 0
          ? { type: quote.discountType, value: discountValue }
          : null
        : null,
    taxRate: Number(quote.taxRate),
  };
}
