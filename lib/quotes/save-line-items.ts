import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quoteLineItems } from "@/lib/db/schema";
import type { LineItem } from "@/lib/quotes/line-items";

type Executor = Pick<typeof db, "delete" | "insert">;

/** Replace a quote's items with `items`, in order. */
export async function replaceQuoteLineItems(
  executor: Executor,
  input: { organizationId: string; quoteId: string; items: LineItem[] },
) {
  await executor.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, input.quoteId));
  if (input.items.length === 0) {
    return;
  }
  await executor.insert(quoteLineItems).values(
    input.items.map((item, index) => ({
      organizationId: input.organizationId,
      quoteId: input.quoteId,
      description: item.description,
      quantity: item.quantity.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      sortOrder: index,
    })),
  );
}

export async function listQuoteLineItems(quoteId: string) {
  const rows = await db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId))
    .orderBy(asc(quoteLineItems.sortOrder));
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
  }));
}
