import { formatMoney } from "@/lib/format";
import type { QuoteDocument } from "@/lib/quotes/quote-document";

/** Read-only options, items and totals for the team's quote page. */
export function QuotePricingView({ document }: { document: QuoteDocument }) {
  const multiple = document.options.length > 1;
  return (
    <div className="space-y-4">
      {document.options.map((option, index) => {
        const chosen = document.acceptedOptionIndex === index;
        return (
          <div key={option.id ?? index} className={multiple ? `rounded-xl border p-3 ${chosen ? "border-emerald-400 bg-emerald-50/40" : "border-border/80"}` : ""}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {multiple ? `Option ${index + 1}: ${option.name}` : "Items"}
              </p>
              {chosen ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">Chosen by customer</span> : null}
            </div>
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit price</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {option.items.map((item) => (
                    <tr key={item.id}>
                      <td className="min-w-40 px-3 py-2.5">{item.description}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  {option.totals.discount > 0 || option.totals.tax > 0 ? (
                    <tr className="border-t border-border/80 text-muted-foreground">
                      <td colSpan={3} className="px-3 pt-2.5 text-right">Subtotal</td>
                      <td className="px-3 pt-2.5 text-right tabular-nums">{formatMoney(option.totals.subtotal)}</td>
                    </tr>
                  ) : null}
                  {option.totals.discount > 0 ? (
                    <tr className="text-muted-foreground">
                      <td colSpan={3} className="px-3 pt-1 text-right">
                        Discount{document.discount?.type === "percent" ? ` (${document.discount.value}%)` : ""}
                      </td>
                      <td className="px-3 pt-1 text-right tabular-nums">−{formatMoney(option.totals.discount)}</td>
                    </tr>
                  ) : null}
                  {option.totals.tax > 0 ? (
                    <tr className="text-muted-foreground">
                      <td colSpan={3} className="px-3 pt-1 text-right">Tax ({document.taxRate}%)</td>
                      <td className="px-3 pt-1 text-right tabular-nums">{formatMoney(option.totals.tax)}</td>
                    </tr>
                  ) : null}
                  <tr className="border-t border-border/80">
                    <td colSpan={3} className="px-3 py-2.5 text-right font-semibold">Total</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoney(option.totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
