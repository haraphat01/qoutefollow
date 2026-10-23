import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, FileText, Mail, Paperclip, Pencil, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { QuoteEmailAudit } from "@/components/quotes/quote-email-audit";
import { QuoteFollowUpControls } from "@/components/quotes/quote-follow-up-controls";
import { QuoteInternalNotes } from "@/components/quotes/quote-internal-notes";
import { QuoteSequenceSelect } from "@/components/quotes/quote-sequence-select";
import { ReplyIntelligenceBanner } from "@/components/quotes/reply-intelligence-banner";
import { QuoteStatusActions } from "@/components/quotes/quote-status-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getNextScheduledFollowUp } from "@/lib/follow-ups/schedule";
import { listQuoteConversations } from "@/lib/queries/conversations";
import { listQuoteInternalNotes } from "@/lib/queries/internal-notes";
import { listOrganizationMembers } from "@/lib/queries/members";
import { listQuoteDocuments } from "@/lib/queries/documents";
import { getQuoteDetail } from "@/lib/queries/quotes";
import { lineTotal } from "@/lib/quotes/line-items";
import { listQuoteLineItems } from "@/lib/quotes/save-line-items";
import { getLatestInboundInsight } from "@/lib/queries/intelligence";
import { getQuoteEmailAuditLog } from "@/lib/queries/quote-email-audit";
import { formatClassificationLabel } from "@/lib/replies/classification-labels";
import { listOrganizationSequences } from "@/lib/queries/sequences";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { followUpSequences, followUpSteps, scheduledFollowUps } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { isExpirationUrgent, daysUntilExpiration } from "@/lib/follow-ups/expiration";

export default async function QuoteDetailPage({
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
  const lineItems = await listQuoteLineItems(quote.id);

  const [
    conversationRows,
    internalNotes,
    members,
    sequences,
    nextFollowUp,
    sequenceName,
    emailAudit,
    inboundInsight,
    documents,
  ] = await Promise.all([
    listQuoteConversations(session.organization.id, quote.id),
    listQuoteInternalNotes(session.organization.id, quote.id),
    listOrganizationMembers(session.organization.id),
    listOrganizationSequences(session.organization.id),
    getNextScheduledFollowUp(quote.id),
    quote.sequenceId
      ? db
          .select({ name: followUpSequences.name })
          .from(followUpSequences)
          .where(eq(followUpSequences.id, quote.sequenceId))
          .limit(1)
          .then((rows) => rows[0]?.name ?? null)
      : Promise.resolve(null),
    getQuoteEmailAuditLog(session.organization.id, quote.id),
    getLatestInboundInsight(session.organization.id, quote.id),
    listQuoteDocuments(session.organization.id, quote.id),
  ]);

  const mentionHandles = members
    .map((m) => `@${m.name.trim().split(/\s+/)[0]}`)
    .join(", ");
  const memberHint = mentionHandles
    ? `Mention teammates: ${mentionHandles}`
    : "Add teammates under Settings → Team to @mention them.";

  const expirationDays = daysUntilExpiration(quote.expiresAt);
  const expirationNote =
    quote.expiresAt && isExpirationUrgent(quote.expiresAt)
      ? `Expires in ${expirationDays} day${expirationDays === 1 ? "" : "s"} — follow-ups use urgent wording automatically.`
      : null;

  const schedule = await db
    .select({
      id: scheduledFollowUps.id,
      scheduledFor: scheduledFollowUps.scheduledFor,
      status: scheduledFollowUps.status,
      dayOffset: followUpSteps.dayOffset,
      subject: followUpSteps.subject,
    })
    .from(scheduledFollowUps)
    .innerJoin(followUpSteps, eq(scheduledFollowUps.stepId, followUpSteps.id))
    .where(eq(scheduledFollowUps.quoteId, quote.id))
    .orderBy(scheduledFollowUps.scheduledFor);

  return (
    <div className="space-y-7">
      <Link href="/quotes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> All quotes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">QUOTE DETAILS</p>
          <h1 className="page-heading">{quote.quoteNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Created {formatDate(quote.quoteDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          <QuoteStatusBadge status={quote.status} />
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/quotes/${quote.id}/edit`}><Pencil className="size-3.5" /> Edit quote</Link>
          </Button>
        </div>
      </div>

      <ReplyIntelligenceBanner
        quoteId={quote.id}
        currentStatus={quote.status}
        classification={inboundInsight?.replyClassification ?? null}
        suggestedStatus={inboundInsight?.suggestedQuoteStatus ?? null}
        summary={inboundInsight?.aiSummary ?? null}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#edf4ed] text-[#4c7959]"><FileText className="size-5" /></span>
              <div>
                <CardTitle>Estimate</CardTitle>
                <CardDescription className="mt-1">Details for this proposed job.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="rounded-xl bg-muted/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Quote amount</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{formatMoney(quote.amount)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Job description</p>
              <p className="mt-2 text-sm leading-relaxed">{quote.jobDescription}</p>
            </div>
            {lineItems.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Items</p>
                <div className="mt-2 overflow-x-auto rounded-xl border border-border/80">
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
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="min-w-40 px-3 py-2.5">{item.description}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatMoney(lineTotal(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border/80">
                        <td colSpan={3} className="px-3 py-2.5 text-right font-semibold">Total</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoney(quote.amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Expires</p>
                <p className="mt-1.5 text-sm font-medium">{quote.expiresAt ? formatDate(quote.expiresAt) : "No expiration date"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Follow-up schedule</p>
                <p className="mt-1.5 text-sm font-medium">
                  {quote.followUpsEnabled
                    ? `Enabled · ${sequenceName ?? "Default sequence"}`
                    : "Turned off for this quote"}
                </p>
                {expirationNote ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    {expirationNote}
                  </p>
                ) : null}
              </div>
            </div>
            {documents.length > 0 ? (
              <div className="border-t border-border/70 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Source document</p>
                <ul className="mt-1.5 space-y-1">
                  {documents.map((document) => (
                    <li key={document.id}>
                      <a href={`/api/documents/${document.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                        <Paperclip className="size-3.5" /> {document.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {quote.notes ? (
              <div className="border-t border-border/70 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Internal notes</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{quote.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="gap-0">
            <CardHeader className="pb-3">
              <CardTitle>Customer</CardTitle>
              <CardDescription>Contact for this estimate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-muted text-primary"><UserRound className="size-4" /></span>
                <Link href={`/customers/${customer.id}`} className="text-sm font-semibold hover:text-primary">{customer.name}</Link>
              </div>
              <a href={`mailto:${customer.email}`} className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <Mail className="size-4 shrink-0" /><span className="min-w-0 break-all">{customer.email}</span>
              </a>
            </CardContent>
          </Card>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>Follow-up actions</CardTitle>
              <CardDescription className="mt-1">
                Send early or snooze the next automated email.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <QuoteFollowUpControls
                quoteId={quote.id}
                nextScheduledId={nextFollowUp?.id ?? null}
                nextScheduledAt={
                  nextFollowUp?.scheduledFor?.toISOString() ?? null
                }
              />
            </CardContent>
          </Card>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>Sequence</CardTitle>
              <CardDescription className="mt-1">
                Switch cadence for this quote.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <QuoteSequenceSelect
                quoteId={quote.id}
                currentSequenceId={quote.sequenceId}
                sequences={sequences.map((s) => ({
                  id: s.id,
                  name: s.name,
                  isDefault: s.isDefault,
                }))}
                disabled={quote.status !== "pending" && quote.status !== "paused"}
              />
            </CardContent>
          </Card>
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>Update status</CardTitle>
              <CardDescription className="mt-1">Close or pause follow-ups as the job progresses.</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <QuoteStatusActions quoteId={quote.id} status={quote.status} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Team notes</CardTitle>
          <CardDescription className="mt-1">
            Internal thread with @mentions — not visible to customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <QuoteInternalNotes
            quoteId={quote.id}
            memberHint={memberHint}
            notes={internalNotes.map((row) => ({
              id: row.note.id,
              body: row.note.body,
              authorName: row.authorName,
              createdAt: row.note.createdAt,
            }))}
          />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Email audit trail</CardTitle>
          <CardDescription className="mt-1">
            Delivery record for this quote — useful for disputes and compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <QuoteEmailAudit entries={emailAudit} />
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription className="mt-1">
            Outbound follow-ups and inbound replies (when Resend inbound is enabled).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {conversationRows.length === 0 ? (
            <div className="rounded-xl bg-muted/65 px-4 py-5 text-sm text-muted-foreground">
              No messages yet. Approved quotes will show outbound follow-ups here.
            </div>
          ) : (
            <ul className="space-y-3">
              {conversationRows.map((message) => {
                const insightLabel =
                  message.direction === "inbound"
                    ? formatClassificationLabel(message.replyClassification)
                    : null;
                return (
                <li
                  key={message.id}
                  className="rounded-xl border border-border/70 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium capitalize">{message.direction}</p>
                    {insightLabel ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {insightLabel}
                      </span>
                    ) : null}
                  </div>
                  {message.subject ? (
                    <p className="mt-1 text-muted-foreground">{message.subject}</p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
                  {message.direction === "inbound" && message.aiSummary ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      AI summary: {message.aiSummary}
                    </p>
                  ) : null}
                </li>
              );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <span className="grid size-10 place-items-center rounded-xl bg-[#edf1f4] text-[#557080]"><CalendarDays className="size-5" /></span>
          <div>
            <CardTitle>Scheduled follow-ups</CardTitle>
            <CardDescription className="mt-1">Your quote’s planned touchpoints and current status.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {schedule.length === 0 ? (
            <div className="rounded-xl bg-muted/65 px-4 py-5 text-sm text-muted-foreground">
              {quote.followUpsEnabled
                ? "No follow-up touchpoints are scheduled yet. Set this quote to open to begin its schedule."
                : "Follow-ups are turned off for this quote."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead>Scheduled for</TableHead>
                  <TableHead>Email subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">Day {row.dayOffset}</TableCell>
                    <TableCell>{formatDate(row.scheduledFor)}</TableCell>
                    <TableCell>{row.subject}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{row.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
