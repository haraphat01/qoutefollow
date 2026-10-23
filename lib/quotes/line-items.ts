import { z } from "zod";

export const MAX_LINE_ITEMS = 100;

export const lineItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Describe each item")
    .max(300, "Keep item descriptions under 300 characters"),
  quantity: z.coerce
    .number()
    .positive("Quantity must be more than zero")
    .max(1_000_000, "Quantity is too large"),
  unitPrice: z.coerce
    .number()
    .min(0, "Price can't be negative")
    .max(100_000_000, "Price is too large"),
});

export type LineItem = z.infer<typeof lineItemSchema>;

/**
 * Quantities and prices are stored to 2 decimals, so multiply them as whole
 * hundredths and cents: 2.5 × $19.99 is exactly 4997.5¢ and rounds to $49.98,
 * where float math gives 49.97499… and rounds down.
 */
function lineCents(item: Pick<LineItem, "quantity" | "unitPrice">) {
  const hundredths = Math.round(item.quantity * 100);
  const cents = Math.round(item.unitPrice * 100);
  return Math.round((hundredths * cents) / 100);
}

export function lineTotal(item: Pick<LineItem, "quantity" | "unitPrice">) {
  return lineCents(item) / 100;
}

export function quoteTotal(items: Pick<LineItem, "quantity" | "unitPrice">[]) {
  return items.reduce((sum, item) => sum + lineCents(item), 0) / 100;
}

/**
 * Reads the JSON `lineItems` field the quote forms submit. Returns the
 * validated items and their total, or an error message for the form.
 */
export function parseLineItemsField(
  value: FormDataEntryValue | null,
): { items: LineItem[]; total: number } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(typeof value === "string" ? value : "");
  } catch {
    return { error: "Add at least one item." };
  }

  const parsed = z
    .array(lineItemSchema)
    .min(1, "Add at least one item.")
    .max(MAX_LINE_ITEMS, `Use at most ${MAX_LINE_ITEMS} items.`)
    .safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the items." };
  }

  const total = quoteTotal(parsed.data);
  if (total <= 0) {
    return { error: "The quote total must be more than zero." };
  }
  return { items: parsed.data, total };
}
