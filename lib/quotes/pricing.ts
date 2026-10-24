import { z } from "zod";

import { MAX_LINE_ITEMS, lineItemSchema, type LineItem } from "@/lib/quotes/line-items";

/**
 * A quote's pricing: one unnamed option for a plain quote, or 2–3 named
 * options (Good / Better / Best) the customer chooses between. Discount and
 * tax apply to whichever option is chosen.
 */
export type QuotePricing = {
  options: { name: string | null; items: LineItem[] }[];
  discount: { type: "percent" | "amount"; value: number } | null;
  taxRate: number;
};

/** What the pricing editor starts from: numbers may still be raw input. */
export type LineItemDraft = { description: string; quantity: number | string; unitPrice: number | string };
export type PricingDraft = {
  options: { name: string | null; items: LineItemDraft[] }[];
  discount: QuotePricing["discount"];
  taxRate: number;
};

export type PricingTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export const MAX_OPTIONS = 3;
export const MAX_TAX_RATE = 30;

const cents = (value: number) => Math.round(value * 100);

function lineCents(item: Pick<LineItem, "quantity" | "unitPrice">) {
  return Math.round((Math.round(item.quantity * 100) * cents(item.unitPrice)) / 100);
}

export function computeTotals(
  items: Pick<LineItem, "quantity" | "unitPrice">[],
  discount: QuotePricing["discount"],
  taxRate: number,
): PricingTotals {
  const subtotal = items.reduce((sum, item) => sum + lineCents(item), 0);
  let off = 0;
  if (discount && discount.value > 0) {
    off =
      discount.type === "percent"
        ? Math.round((subtotal * Math.min(discount.value, 100)) / 100)
        : Math.min(cents(discount.value), subtotal);
  }
  const taxable = subtotal - off;
  // Tax rates carry up to 3 decimals, so scale by 1000 to stay in integers.
  const tax = Math.round((taxable * Math.round(taxRate * 1000)) / 100_000);
  return {
    subtotal: subtotal / 100,
    discount: off / 100,
    tax: tax / 100,
    total: (taxable + tax) / 100,
  };
}

export function optionTotals(pricing: QuotePricing) {
  return pricing.options.map((option) =>
    computeTotals(option.items, pricing.discount, pricing.taxRate),
  );
}

/** The amount stored on the quote: the chosen option, else the first. */
export function quoteAmount(pricing: QuotePricing, chosenIndex = 0) {
  return optionTotals(pricing)[chosenIndex]?.total ?? 0;
}

const pricingSchema = z
  .object({
    options: z
      .array(
        z.object({
          name: z.string().trim().max(60, "Keep option names short").nullable(),
          items: z
            .array(lineItemSchema)
            .min(1, "Add at least one item.")
            .max(MAX_LINE_ITEMS, `Use at most ${MAX_LINE_ITEMS} items.`),
        }),
      )
      .min(1, "Add at least one item.")
      .max(MAX_OPTIONS, `Offer at most ${MAX_OPTIONS} options.`),
    discount: z
      .object({
        type: z.enum(["percent", "amount"]),
        value: z.coerce.number().min(0, "Discounts can't be negative"),
      })
      .nullable(),
    taxRate: z.coerce
      .number()
      .min(0, "Tax rate can't be negative")
      .max(MAX_TAX_RATE, `Tax rate must be ${MAX_TAX_RATE}% or less`),
  })
  .superRefine((value, ctx) => {
    if (value.options.length > 1) {
      value.options.forEach((option, index) => {
        if (!option.name) {
          ctx.addIssue({ code: "custom", message: `Name option ${index + 1}.`, path: ["options", index, "name"] });
        }
      });
    }
    if (value.discount?.type === "percent" && value.discount.value > 100) {
      ctx.addIssue({ code: "custom", message: "A percentage discount can't exceed 100%.", path: ["discount"] });
    }
  });

/**
 * Reads the JSON `pricing` field the quote forms submit and recalculates every
 * total on the server. Returns the pricing and the amount to store.
 */
export function parsePricingField(
  value: FormDataEntryValue | null,
): { pricing: QuotePricing; amount: number } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(typeof value === "string" ? value : "");
  } catch {
    return { error: "Add at least one item." };
  }

  const parsed = pricingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the pricing." };
  }

  const pricing: QuotePricing = {
    options:
      parsed.data.options.length === 1
        ? [{ name: null, items: parsed.data.options[0].items }]
        : parsed.data.options.map((option) => ({ name: option.name, items: option.items })),
    discount: parsed.data.discount && parsed.data.discount.value > 0 ? parsed.data.discount : null,
    taxRate: parsed.data.taxRate,
  };

  const totals = optionTotals(pricing);
  if (totals.some((total) => total.total <= 0)) {
    return {
      error:
        pricing.options.length > 1
          ? "Every option's total must be more than zero."
          : "The quote total must be more than zero.",
    };
  }
  return { pricing, amount: totals[0].total };
}
