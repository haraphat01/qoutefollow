import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Download, Mail, Phone } from "lucide-react";

import { AcceptQuoteForm } from "@/components/public-quote/accept-form";
import { getSession } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";
import { logoUrl } from "@/lib/quotes/branding";
import { ACCEPTABLE_STATUSES } from "@/lib/quotes/accept-quote";
import { loadQuoteDocument } from "@/lib/quotes/quote-document";
import { trackQuoteView } from "@/lib/quotes/track-view";

export const instant = false;

const TOKEN_PATTERN = /^[\w-]{20,64}$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const document = TOKEN_PATTERN.test(token) ? await loadQuoteDocument({ publicToken: token }) : null;
  return {
    title: document ? `Estimate ${document.quote.quoteNumber} from ${document.organization.name}` : "Estimate",
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const document = TOKEN_PATTERN.test(token) ? await loadQuoteDocument({ publicToken: token }) : null;
  if (!document) {
    notFound();
  }
  const { quote, customer, organization } = document;

  // The contractor previewing their own quote shouldn't count as a customer view.
  const session = await getSession();
  const isTeamPreview = session?.organization.id === organization.id;
  if (!isTeamPreview) {
    await trackQuoteView(quote);
  }

  const multiple = document.options.length > 1;
  const expired = Boolean(quote.expiresAt && quote.expiresAt < new Date());
  const open = (ACCEPTABLE_STATUSES as readonly string[]).includes(quote.status) && !expired && !quote.acceptedAt;
  const logo = logoUrl(organization);

  return (
    <div className="min-h-screen bg-[#f6f7f2] text-[#1d3029]">
      {isTeamPreview ? (
        <p className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">
          Preview: this is what your customer sees. Your visit isn&apos;t counted as a customer view.
        </p>
      ) : null}
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own logo route
          <img src={logo} alt={organization.name} className="h-12 w-auto max-w-[200px] object-contain" />
        ) : (
          <p className="text-lg font-bold tracking-tight">{organization.name}</p>
        )}
        <a
          href={`/q/${token}/pdf`}
          className="inline-flex items-center gap-2 rounded-lg border border-[#d9e1d6] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f0f3ec]"
        >
          <Download className="size-4" /> Download PDF
        </a>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-6 rounded-2xl border border-[#e2e7dd] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(35,75,62,0.4)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#6d7f73]">ESTIMATE</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{quote.quoteNumber}</h1>
              <p className="mt-1 text-sm text-[#66756c]">
                {formatDate(quote.quoteDate)}
                {quote.expiresAt ? ` · valid until ${formatDate(quote.expiresAt)}` : ""}
              </p>
            </div>
            <div className="text-sm sm:text-right">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#6d7f73]">PREPARED FOR</p>
              <p className="mt-1 font-semibold">{customer.name}</p>
              <p className="break-all text-[#66756c]">{customer.email}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#6d7f73]">JOB</p>
            <p className="mt-1.5 whitespace-pre-line text-[0.95rem] leading-relaxed">{quote.jobDescription}</p>
          </div>

          {multiple ? (
            <p className="rounded-xl bg-[#f0f5ee] px-4 py-3 text-sm text-[#355745]">
              {document.options.length} options are included. Compare them below and choose one when you accept.
            </p>
          ) : null}

          {document.options.map((option, index) => {
            const chosen = document.acceptedOptionIndex === index;
            return (
              <div key={option.id ?? index} className={multiple ? `rounded-xl border p-4 ${chosen ? "border-emerald-400 bg-emerald-50/40" : "border-[#e2e7dd]"}` : ""}>
                {multiple ? (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Option {index + 1}: {option.name}</h2>
                    {chosen ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">Accepted</span> : null}
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#e2e7dd] text-left text-xs text-[#6d7f73]">
                      <tr>
                        <th className="py-2 pr-3 font-semibold">Item</th>
                        <th className="py-2 pr-3 text-right font-semibold">Qty</th>
                        <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Unit price</th>
                        <th className="py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf0e9]">
                      {option.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 pr-3">
                            {item.description}
                            <span className="block text-xs text-[#7b8a7f] sm:hidden">{formatMoney(item.unitPrice)} each</span>
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{item.quantity}</td>
                          <td className="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{formatMoney(item.unitPrice)}</td>
                          <td className="py-2.5 text-right font-medium tabular-nums">{formatMoney(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="mt-3 ml-auto max-w-xs space-y-1 text-sm">
                  {option.totals.discount > 0 || option.totals.tax > 0 ? (
                    <div className="flex justify-between text-[#66756c]"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(option.totals.subtotal)}</dd></div>
                  ) : null}
                  {option.totals.discount > 0 ? (
                    <div className="flex justify-between text-[#66756c]">
                      <dt>Discount{document.discount?.type === "percent" ? ` (${document.discount.value}%)` : ""}</dt>
                      <dd className="tabular-nums">−{formatMoney(option.totals.discount)}</dd>
                    </div>
                  ) : null}
                  {option.totals.tax > 0 ? (
                    <div className="flex justify-between text-[#66756c]"><dt>Tax ({document.taxRate}%)</dt><dd className="tabular-nums">{formatMoney(option.totals.tax)}</dd></div>
                  ) : null}
                  <div className="flex justify-between border-t border-[#e2e7dd] pt-2 text-lg font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatMoney(option.totals.total)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-[#e2e7dd] bg-white p-5 sm:p-6">
            {quote.acceptedAt ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-base font-semibold text-emerald-800">
                  <CheckCircle2 className="size-5" /> Accepted
                </p>
                <p>
                  Signed by <strong>{quote.acceptedName}</strong> on{" "}
                  {quote.acceptedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: organization.sendTimezone })}.
                </p>
                {multiple && document.acceptedOptionIndex !== null ? (
                  <p>Option: <strong>{document.options[document.acceptedOptionIndex].name}</strong> · {formatMoney(document.options[document.acceptedOptionIndex].totals.total)}</p>
                ) : null}
                <p className="text-[#66756c]">{organization.name} will be in touch to schedule the work.</p>
              </div>
            ) : open ? (
              <>
                <h2 className="mb-1 text-lg font-semibold">Ready to go ahead?</h2>
                <p className="mb-4 text-sm text-[#66756c]">Accept online and {organization.name} will be in touch to schedule the work.</p>
                {isTeamPreview ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">The accept form is shown to your customer here.</p>
                ) : (
                  <AcceptQuoteForm
                    publicToken={token}
                    businessName={organization.name}
                    options={document.options.map((option) => ({ name: option.name, total: formatMoney(option.totals.total) }))}
                  />
                )}
              </>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="text-base font-semibold">{expired || quote.status === "expired" ? "This estimate has expired" : "This estimate is closed"}</p>
                <p className="text-[#66756c]">Contact {organization.name} for an updated quote.</p>
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-[#e2e7dd] bg-white p-5 text-sm">
            <p className="font-semibold">Questions?</p>
            {organization.businessPhone ? (
              <a href={`tel:${organization.businessPhone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-[#285742] hover:underline">
                <Phone className="size-4" /> {organization.businessPhone}
              </a>
            ) : null}
            {organization.replyEmail ? (
              <a href={`mailto:${organization.replyEmail}?subject=${encodeURIComponent(`Estimate ${quote.quoteNumber}`)}`} className="flex items-center gap-2 break-all text-[#285742] hover:underline">
                <Mail className="size-4 shrink-0" /> {organization.replyEmail}
              </a>
            ) : null}
            {organization.mailingAddress ? <p className="whitespace-pre-line pt-1 text-xs text-[#7b8a7f]">{organization.mailingAddress}</p> : null}
          </div>
        </aside>
      </main>
      <footer className="pb-8 text-center text-xs text-[#8a968e]">Sent with QuoteFollow</footer>
    </div>
  );
}
