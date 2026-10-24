import { and, eq, isNull } from "drizzle-orm";

import { appUrl } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { activityLogs, conversations, notifications, quotes } from "@/lib/db/schema";
import {
  accountEmailsEnabled,
  buildQuoteAcceptedAlertEmail,
  sendAccountEmail,
} from "@/lib/email/account-emails";
import { replyAddressForQuote } from "@/lib/email/reply-address";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { buildAcceptanceConfirmationEmail } from "@/lib/email/templates";
import { createUnsubscribeToken, unsubscribeUrl } from "@/lib/email/unsubscribe";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { formatMoney } from "@/lib/format";
import { listOrganizationMembers } from "@/lib/queries/members";
import { logoUrl, publicQuoteUrl, quotePdfFileName } from "@/lib/quotes/branding";
import { quotePdfBytes } from "@/lib/quotes/pdf-response";
import { loadQuoteDocument } from "@/lib/quotes/quote-document";

export const ACCEPTABLE_STATUSES = ["draft", "pending", "paused"] as const;

export type AcceptQuoteResult = { ok: true } | { ok: false; reason: string };

/**
 * The customer accepts (signs) their quote online. Records who signed, when,
 * from where, and which option; stops follow-ups; tells the team; and emails
 * the customer a signed copy.
 */
export async function acceptQuote(input: {
  publicToken: string;
  signerName: string;
  optionIndex: number;
  ip: string | null;
  userAgent: string | null;
}): Promise<AcceptQuoteResult> {
  const document = await loadQuoteDocument({ publicToken: input.publicToken });
  if (!document) {
    return { ok: false, reason: "This quote link isn't valid." };
  }
  const { quote, organization, customer } = document;

  if (quote.acceptedAt) {
    return { ok: false, reason: "This quote has already been accepted." };
  }
  if (!(ACCEPTABLE_STATUSES as readonly string[]).includes(quote.status)) {
    return { ok: false, reason: "This quote is no longer open. Contact us for an updated estimate." };
  }
  if (quote.expiresAt && quote.expiresAt < new Date()) {
    return { ok: false, reason: "This quote has expired. Contact us for an updated estimate." };
  }
  const signerName = input.signerName.trim().replace(/\s+/g, " ");
  if (signerName.length < 2 || signerName.length > 100) {
    return { ok: false, reason: "Type your full name to sign." };
  }
  const option = document.options[input.optionIndex];
  if (!option) {
    return { ok: false, reason: "Choose an option to accept." };
  }

  const now = new Date();
  const [accepted] = await db
    .update(quotes)
    .set({
      status: "accepted",
      acceptedAt: now,
      acceptedName: signerName,
      acceptedOptionId: option.id,
      acceptedIp: input.ip?.slice(0, 100) ?? null,
      acceptedUserAgent: input.userAgent?.slice(0, 300) ?? null,
      amount: option.totals.total.toFixed(2),
      updatedAt: now,
    })
    // Guards against a double submit accepting twice.
    .where(and(eq(quotes.id, quote.id), isNull(quotes.acceptedAt)))
    .returning({ id: quotes.id });
  if (!accepted) {
    return { ok: false, reason: "This quote has already been accepted." };
  }

  await cancelScheduledFollowUpsForQuote(quote.id);
  const total = formatMoney(option.totals.total);
  const choice = document.options.length > 1 ? option.name : null;

  await db.insert(activityLogs).values({
    organizationId: organization.id,
    entityType: "quote",
    entityId: quote.id,
    action: "accepted_online",
    metadata: JSON.stringify({ signedBy: signerName, option: choice, total: option.totals.total.toFixed(2) }),
  });
  await db.insert(notifications).values({
    organizationId: organization.id,
    quoteId: quote.id,
    type: "quote_accepted",
    title: `${customer.name} accepted ${quote.quoteNumber}`,
    body: `Signed online by ${signerName}${choice ? ` · ${choice}` : ""} · ${total}. Follow-ups have stopped.`,
  });
  await db.insert(conversations).values({
    organizationId: organization.id,
    quoteId: quote.id,
    direction: "inbound",
    subject: "Accepted online",
    body: `Accepted and signed online by ${signerName}${choice ? ` (option: ${choice})` : ""}. Total ${total}.`,
    fromEmail: customer.email,
  });

  // The acceptance is saved; emails are best-effort.
  if (accountEmailsEnabled()) {
    const refreshed = await loadQuoteDocument({ publicToken: input.publicToken });
    const alert = buildQuoteAcceptedAlertEmail({
      quoteNumber: quote.quoteNumber,
      customerName: customer.name,
      signerName,
      optionName: choice,
      total,
      url: appUrl(`/quotes/${quote.id}`),
    });
    const members = await listOrganizationMembers(organization.id);
    const recipients = members.filter(
      (member) =>
        member.emailVerifiedAt !== null && (member.role === "owner" || member.id === quote.assignedUserId),
    );
    await Promise.allSettled(recipients.map((member) => sendAccountEmail(member.email, alert, { replyTo: customer.email })));

    if (refreshed) {
      try {
        const confirmation = buildAcceptanceConfirmationEmail({
          businessName: organization.name,
          replyEmail: organization.replyEmail,
          businessPhone: organization.businessPhone,
          emailSignature: organization.emailSignature,
          mailingAddress: organization.mailingAddress,
          unsubscribeUrl: unsubscribeUrl(createUnsubscribeToken({ organizationId: organization.id, email: customer.email })),
          replyTo: replyAddressForQuote(quote.id) ?? organization.replyEmail,
          logoUrl: logoUrl(organization),
          viewUrl: publicQuoteUrl(input.publicToken),
          customerName: customer.name,
          signerName,
          quoteNumber: quote.quoteNumber,
          jobDescription: quote.jobDescription,
          optionName: choice,
          total,
          acceptedAt: now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: organization.sendTimezone }),
        });
        await sendTransactionalEmail({
          fromName: organization.name,
          to: customer.email,
          subject: confirmation.subject,
          text: confirmation.text,
          html: confirmation.html,
          replyTo: replyAddressForQuote(quote.id) ?? organization.replyEmail,
          attachments: [
            {
              filename: quotePdfFileName(quote.quoteNumber, organization.name),
              content: Buffer.from(await quotePdfBytes(refreshed)),
            },
          ],
        });
      } catch {
        // The customer still sees the confirmation on the page.
      }
    }
  }

  return { ok: true };
}
