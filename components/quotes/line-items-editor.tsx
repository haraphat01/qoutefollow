"use client";

import { useId, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_LINE_ITEMS, lineTotal } from "@/lib/quotes/line-items";
import {
  MAX_OPTIONS,
  computeTotals,
  type LineItemDraft,
  type PricingDraft,
} from "@/lib/quotes/pricing";

export type { LineItemDraft, PricingDraft };

export type PriceBookOption = { id: string; name: string; unitPrice: number };

type Row = { key: number; description: string; quantity: string; unitPrice: string };
type OptionState = { key: number; name: string; rows: Row[] };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const DEFAULT_OPTION_NAMES = ["Good", "Better", "Best"];

const toNumber = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

let nextKey = 1;
function toRow(item?: Partial<LineItemDraft>): Row {
  return {
    key: nextKey++,
    description: item?.description ?? "",
    quantity: item?.quantity !== undefined ? String(item.quantity) : "1",
    unitPrice: item?.unitPrice !== undefined && item.unitPrice !== "" ? String(item.unitPrice) : "",
  };
}
const toItems = (rows: Row[]) =>
  rows.map((row) => ({ description: row.description, quantity: toNumber(row.quantity), unitPrice: toNumber(row.unitPrice) }));

function LineItemRows({
  rows,
  onChange,
  priceBook,
  datalistId,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  priceBook: PriceBookOption[];
  datalistId: string;
}) {
  const id = useId();
  const update = (key: number, patch: Partial<Row>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_8rem_7rem_2.25rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
        <span>Item</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
        <span className="sr-only">Remove</span>
      </div>
      <ul className="space-y-3 sm:space-y-2">
        {rows.map((row, index) => (
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
                list={priceBook.length > 0 ? datalistId : undefined}
                placeholder="e.g. Architectural shingles, installed"
                onChange={(event) => {
                  const description = event.target.value;
                  // Picking a saved item fills its price if none is set yet.
                  const saved = priceBook.find((item) => item.name.toLowerCase() === description.trim().toLowerCase());
                  update(row.key, saved && !row.unitPrice ? { description, unitPrice: String(saved.unitPrice) } : { description });
                }}
                required
              />
            </div>
            <div>
              <label htmlFor={`${id}-qty-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">Qty</label>
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
              <label htmlFor={`${id}-price-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">Unit price</label>
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
              <span className="text-sm font-semibold tabular-nums">
                {money.format(lineTotal({ quantity: toNumber(row.quantity), unitPrice: toNumber(row.unitPrice) }))}
              </span>
            </div>
            <div className="flex justify-end sm:justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                disabled={rows.length === 1}
                aria-label={`Remove item ${index + 1}`}
                onClick={() => onChange(rows.filter((item) => item.key !== row.key))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={rows.length >= MAX_LINE_ITEMS}
          onClick={() => onChange([...rows, toRow()])}
        >
          <Plus className="size-4" /> Add item
        </Button>
        {priceBook.length > 0 ? (
          <select
            aria-label="Add from price book"
            className="h-7 max-w-56 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2 text-[0.8rem]"
            value=""
            disabled={rows.length >= MAX_LINE_ITEMS}
            onChange={(event) => {
              const saved = priceBook.find((item) => item.id === event.target.value);
              if (!saved) return;
              // Replace a single untouched row rather than leaving it blank.
              const blank = rows.length === 1 && !rows[0].description && !rows[0].unitPrice;
              const added = toRow({ description: saved.name, unitPrice: saved.unitPrice });
              onChange(blank ? [added] : [...rows, added]);
            }}
          >
            <option value="">+ From price book…</option>
            {priceBook.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {money.format(item.unitPrice)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Items, optional Good/Better/Best options, discount and tax with live totals.
 * Submits as one JSON `pricing` field; the server recalculates every total.
 */
export function QuotePricingEditor({
  initial,
  priceBook = [],
  defaultTaxRate = 0,
  error,
}: {
  initial?: PricingDraft;
  priceBook?: PriceBookOption[];
  defaultTaxRate?: number;
  error?: string;
}) {
  const datalistId = useId();
  const [options, setOptions] = useState<OptionState[]>(() =>
    (initial?.options.length ? initial.options : [{ name: null, items: [] }]).map((option, index) => ({
      key: nextKey++,
      name: option.name ?? (initial && initial.options.length > 1 ? DEFAULT_OPTION_NAMES[index] : ""),
      rows: option.items.length > 0 ? option.items.map(toRow) : [toRow()],
    })),
  );
  const [discountType, setDiscountType] = useState<"none" | "percent" | "amount">(initial?.discount?.type ?? "none");
  const [discountValue, setDiscountValue] = useState(initial?.discount ? String(initial.discount.value) : "");
  const [taxRate, setTaxRate] = useState(String(initial ? initial.taxRate : defaultTaxRate));

  const multiple = options.length > 1;
  const discount =
    discountType === "none" || toNumber(discountValue) <= 0
      ? null
      : { type: discountType, value: toNumber(discountValue) };
  const tax = toNumber(taxRate);
  const pricing = {
    options: options.map((option) => ({ name: multiple ? option.name : null, items: toItems(option.rows) })),
    discount,
    taxRate: tax,
  };
  const totals = pricing.options.map((option) => computeTotals(option.items, discount, tax));

  const updateOption = (key: number, patch: Partial<OptionState>) =>
    setOptions((current) => current.map((option) => (option.key === key ? { ...option, ...patch } : option)));

  return (
    <div className="space-y-4">
      <input type="hidden" name="pricing" value={JSON.stringify(pricing)} />
      {priceBook.length > 0 ? (
        <datalist id={datalistId}>
          {priceBook.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
      ) : null}

      <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-sm" role="group" aria-label="Pricing style">
        <button
          type="button"
          aria-pressed={!multiple}
          className={`rounded-md px-3 py-1.5 font-medium ${!multiple ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          onClick={() => setOptions((current) => [{ ...current[0], name: "" }])}
        >
          Single price
        </button>
        <button
          type="button"
          aria-pressed={multiple}
          className={`rounded-md px-3 py-1.5 font-medium ${multiple ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          onClick={() => {
            if (multiple) return;
            // Start "Better" as a copy of the current items to edit from.
            setOptions((current) => [
              { ...current[0], name: DEFAULT_OPTION_NAMES[0] },
              { key: nextKey++, name: DEFAULT_OPTION_NAMES[1], rows: current[0].rows.map((row) => ({ ...row, key: nextKey++ })) },
            ]);
          }}
        >
          Good / Better / Best
        </button>
      </div>
      {multiple ? (
        <p className="text-xs text-muted-foreground">
          The customer picks one option when they accept online. Discount and tax apply to whichever they choose.
        </p>
      ) : null}

      <div className="space-y-4">
        {options.map((option, index) => (
          <section
            key={option.key}
            aria-label={multiple ? `Option ${index + 1}` : "Items"}
            className={multiple ? "space-y-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4" : "space-y-3"}
          >
            {multiple ? (
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Option ${index + 1} name`}
                  value={option.name}
                  maxLength={60}
                  placeholder={DEFAULT_OPTION_NAMES[index]}
                  className="max-w-56 font-semibold"
                  onChange={(event) => updateOption(option.key, { name: event.target.value })}
                  required
                />
                <span className="ml-auto text-sm text-muted-foreground">
                  Subtotal <span className="font-semibold text-foreground tabular-nums">{money.format(totals[index].subtotal)}</span>
                </span>
                {options.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove option ${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
            <LineItemRows
              rows={option.rows}
              onChange={(rows) => updateOption(option.key, { rows })}
              priceBook={priceBook}
              datalistId={datalistId}
            />
          </section>
        ))}
        {multiple && options.length < MAX_OPTIONS ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              setOptions((current) => [
                ...current,
                {
                  key: nextKey++,
                  name: DEFAULT_OPTION_NAMES[current.length] ?? `Option ${current.length + 1}`,
                  rows: current[current.length - 1].rows.map((row) => ({ ...row, key: nextKey++ })),
                },
              ])
            }
          >
            <Plus className="size-4" /> Add option
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${datalistId}-discount`} className="text-sm font-medium">Discount</label>
          <div className="flex gap-2">
            <select
              aria-label="Discount type"
              className="form-select h-9 w-28 shrink-0 rounded-md border border-input bg-background px-2 text-sm"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as typeof discountType)}
            >
              <option value="none">None</option>
              <option value="percent">%</option>
              <option value="amount">$ off</option>
            </select>
            <Input
              id={`${datalistId}-discount`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={discountType === "percent" ? "10" : "0.00"}
              value={discountValue}
              disabled={discountType === "none"}
              onChange={(event) => setDiscountValue(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${datalistId}-tax`} className="text-sm font-medium">Tax rate (%)</label>
          <Input
            id={`${datalistId}-tax`}
            type="number"
            min="0"
            max="30"
            step="0.001"
            inputMode="decimal"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl bg-muted/60 p-4 text-sm">
        {multiple ? (
          <table className="w-full">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 text-left font-medium">Option</th>
                <th className="pb-2 text-right font-medium">Subtotal</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">Discount</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">Tax</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {options.map((option, index) => (
                <tr key={option.key}>
                  <td className="py-1 font-medium">{option.name || `Option ${index + 1}`}</td>
                  <td className="py-1 text-right tabular-nums">{money.format(totals[index].subtotal)}</td>
                  <td className="hidden py-1 text-right tabular-nums sm:table-cell">−{money.format(totals[index].discount)}</td>
                  <td className="hidden py-1 text-right tabular-nums sm:table-cell">{money.format(totals[index].tax)}</td>
                  <td className="py-1 text-right font-semibold tabular-nums" data-testid={`option-total-${index}`}>{money.format(totals[index].total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <dl className="ml-auto max-w-xs space-y-1">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{money.format(totals[0].subtotal)}</dd></div>
            {totals[0].discount > 0 ? (
              <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">−{money.format(totals[0].discount)}</dd></div>
            ) : null}
            {totals[0].tax > 0 ? (
              <div className="flex justify-between"><dt className="text-muted-foreground">Tax ({tax}%)</dt><dd className="tabular-nums">{money.format(totals[0].tax)}</dd></div>
            ) : null}
            <div className="flex justify-between border-t border-border/80 pt-1.5 text-base font-semibold">
              <dt>Total ({options[0].rows.length} {options[0].rows.length === 1 ? "item" : "items"})</dt>
              <dd className="tabular-nums" data-testid="quote-total">{money.format(totals[0].total)}</dd>
            </div>
          </dl>
        )}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
