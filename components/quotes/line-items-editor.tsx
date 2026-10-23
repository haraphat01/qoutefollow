"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_LINE_ITEMS, lineTotal, quoteTotal } from "@/lib/quotes/line-items";

type Row = { key: number; description: string; quantity: string; unitPrice: string };

export type LineItemDraft = { description: string; quantity: number | string; unitPrice: number | string };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

let nextKey = 1;
function toRow(item?: LineItemDraft): Row {
  return {
    key: nextKey++,
    description: item?.description ?? "",
    quantity: item ? String(item.quantity) : "1",
    unitPrice: item && item.unitPrice !== "" ? String(item.unitPrice) : "",
  };
}

/**
 * Itemized lines with a live total. Submits as one JSON `lineItems` field;
 * the server recalculates the total rather than trusting this one.
 */
export function LineItemsEditor({
  initialItems,
  error,
}: {
  initialItems?: LineItemDraft[];
  error?: string;
}) {
  const id = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems && initialItems.length > 0 ? initialItems.map(toRow) : [toRow()],
  );

  const items = rows.map((row) => ({
    description: row.description,
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unitPrice),
  }));
  const total = quoteTotal(items);

  function update(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="lineItems" value={JSON.stringify(items)} />

      <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_8rem_7rem_2.25rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
        <span>Item</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
        <span className="sr-only">Remove</span>
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {rows.map((row, index) => {
          const amount = lineTotal({ quantity: toNumber(row.quantity), unitPrice: toNumber(row.unitPrice) });
          return (
            <li
              key={row.key}
              className="grid grid-cols-2 gap-2 rounded-xl border border-border/80 p-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_8rem_7rem_2.25rem] sm:items-center sm:rounded-none sm:border-0 sm:p-0"
            >
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={`${id}-desc-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                  Item {index + 1}
                </label>
                <Input
                  id={`${id}-desc-${row.key}`}
                  value={row.description}
                  maxLength={300}
                  placeholder="e.g. Architectural shingles, installed"
                  onChange={(event) => update(row.key, { description: event.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor={`${id}-qty-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                  Qty
                </label>
                <Input
                  id={`${id}-qty-${row.key}`}
                  value={row.quantity}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  onChange={(event) => update(row.key, { quantity: event.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor={`${id}-price-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                  Unit price
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id={`${id}-price-${row.key}`}
                    value={row.unitPrice}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-6"
                    onChange={(event) => update(row.key, { unitPrice: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between sm:block sm:text-right">
                <span className="text-xs font-medium text-muted-foreground sm:hidden">Amount</span>
                <span className="text-sm font-semibold tabular-nums">{money.format(amount)}</span>
              </div>
              <div className="flex justify-end sm:justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={rows.length === 1}
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={rows.length >= MAX_LINE_ITEMS}
          onClick={() => setRows((current) => [...current, toRow()])}
        >
          <Plus className="size-4" /> Add item
        </Button>
        <p className="text-sm">
          <span className="text-muted-foreground">Total ({rows.length} {rows.length === 1 ? "item" : "items"}) </span>
          <span className="ml-2 text-lg font-semibold tabular-nums" data-testid="quote-total">{money.format(total)}</span>
        </p>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
