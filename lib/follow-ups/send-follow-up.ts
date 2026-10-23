import { and, eq } from "drizzle-orm";

import { sendTransactionalEmail } from "@/lib/email/resend";
import { buildFollowUpTemplateVariables } from "@/lib/email/build-template-variables";
import {
  buildFollowUpEmailHtml,
  buildFollowUpEmailText,
  renderEmailTemplate,
} from "@/lib/email/templates";
import { replyAddressForQuote } from "@/lib/email/reply-address";
import { createUnsubscribeToken, unsubscribeUrl } from "@/lib/email/unsubscribe";
import { db } from "@/lib/db";
import {
  conversations,
  emailEvents,
  followUpSteps,
  organizations,
  quotes,
  scheduledFollowUps,
  customers,
} from "@/lib/db/schema";
import { applyExpirationUrgency, isPastExpiration } from "@/lib/follow-ups/expiration";
import {
  cancelScheduledFollowUpsForQuote,
  isQuoteEligibleForAutomation,
} from "@/lib/follow-ups/schedule";
import { formatDate } from "@/lib/format";
import {
  alignToBusinessSendWindow,
  DEFAULT_SEND_TIMEZONE,
  isWithinBusinessSendWindow,
} from "@/lib/follow-ups/send-window";
import {
  isRetryableError,
  MAX_SEND_ATTEMPTS,
  nextRetryDate,
} from "@/lib/follow-ups/retry";
import { resolveEntitlements } from "@/lib/billing/entitlements";
import { isEmailSuppressed } from "@/lib/suppressions";

export type SendFollowUpResult =
  | { ok: true; scheduledFollowUpId: string }
  | { ok: false; reason: string };

async function loadSendContext(scheduledFollowUpId: string) {
  const [row] = await db
    .select({
      scheduled: scheduledFollowUps,
      step: followUpSteps,
      quote: quotes,
      customer: customers,
      organization: organizations,
    })
    .from(scheduledFollowUps)
    .innerJoin(followUpSteps, eq(scheduledFollowUps.stepId, followUpSteps.id))
    .innerJoin(quotes, eq(scheduledFollowUps.quoteId, quotes.id))
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .innerJoin(organizations, eq(quotes.organizationId, organizations.id))
    .where(eq(scheduledFollowUps.id, scheduledFollowUpId))
    .limit(1);

  return row ?? null;
}

export async function sendScheduledFollowUp(
  scheduledFollowUpId: string,
  options?: { force?: boolean },
): Promise<SendFollowUpResult> {
  const row = await loadSendContext(scheduledFollowUpId);
  if (!row) {
    return { ok: false, reason: "Follow-up not found." };
  }

  const { scheduled, step, quote, customer, organization } = row;

  if (scheduled.status !== "scheduled") {
    return { ok: false, reason: "This follow-up is not scheduled to send." };
  }

  const now = new Date();
  if (!options?.force && scheduled.scheduledFor > now) {
    return { ok: false, reason: "This follow-up is not due yet." };
  }

  const timeZone = organization.sendTimezone ?? DEFAULT_SEND_TIMEZONE;
  if (!options?.force && !isWithinBusinessSendWindow(now, timeZone)) {
    const aligned = alignToBusinessSendWindow(now, timeZone);
    await db
      .update(scheduledFollowUps)
      .set({ scheduledFor: aligned })
      .where(eq(scheduledFollowUps.id, scheduled.id));
    return {
      ok: false,
      reason: "Outside business hours; rescheduled to the next send window.",
    };
  }

  if (isPastExpiration(quote.expiresAt)) {
    await cancelScheduledFollowUpsForQuote(quote.id);
    await db
      .update(quotes)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(quotes.id, quote.id));
    return { ok: false, reason: "Quote has expired; follow-ups were stopped." };
  }

  if (
    !quote.contactConfirmed ||
    !quote.followUpsEnabled ||
    !isQuoteEligibleForAutomation(quote.status)
  ) {
    await db
      .update(scheduledFollowUps)
      .set({ status: "skipped" })
      .where(eq(scheduledFollowUps.id, scheduled.id));
    return { ok: false, reason: "Quote is not eligible for follow-ups." };
  }

  if (organization.suspendedAt) {
    // Stays queued so sending resumes if an admin lifts the suspension.
    await db
      .update(scheduledFollowUps)
      .set({
        scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        lastError: "Paused: workspace suspended",
      })
      .where(eq(scheduledFollowUps.id, scheduled.id));
    return { ok: false, reason: "This workspace is suspended." };
  }

  const entitlements = resolveEntitlements({
    plan: organization.subscriptionPlan,
    status: organization.subscriptionStatus,
    trialEndsAt: organization.trialEndsAt,
  });
  if (!entitlements.canUseFollowUps) {
    if (!options?.force) {
      // Keep the touchpoint queued so it resumes once billing is active again.
      await db
        .update(scheduledFollowUps)
        .set({
          scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          lastError: "Paused: no active subscription",
        })
        .where(eq(scheduledFollowUps.id, scheduled.id));
    }
    return {
      ok: false,
      reason: "Follow-ups require an active subscription or trial.",
    };
  }

  if (await isEmailSuppressed(organization.id, customer.email)) {
    await db
      .update(scheduledFollowUps)
      .set({ status: "skipped", lastError: "Recipient unsubscribed" })
      .where(eq(scheduledFollowUps.id, scheduled.id));
    return { ok: false, reason: "Customer has unsubscribed." };
  }

  const [claimed] = await db
    .update(scheduledFollowUps)
    .set({ status: "processing", processingStartedAt: new Date() })
    .where(
      and(
        eq(scheduledFollowUps.id, scheduled.id),
        eq(scheduledFollowUps.status, "scheduled"),
      ),
    )
    .returning();

  if (!claimed) {
    return { ok: false, reason: "Could not send — try again." };
  }

  const variables = buildFollowUpTemplateVariables({
    customerName: customer.name,
    jobDescription: quote.jobDescription,
    quoteNumber: quote.quoteNumber,
    amount: quote.amount,
    expiresAt: quote.expiresAt,
    businessName: organization.name,
    replyEmail: organization.replyEmail,
    businessPhone: organization.businessPhone,
  });

  let subject = renderEmailTemplate(step.subject, variables);
  let body = renderEmailTemplate(step.bodyTemplate, variables);
  const toned = applyExpirationUrgency({
    subject,
    body,
    expiresAt: quote.expiresAt,
    formatDate,
  });
  subject = toned.subject;
  body = toned.body;

  const unsubscribeToken = createUnsubscribeToken({
    organizationId: organization.id,
    email: customer.email,
  });
  const unsub = unsubscribeUrl(unsubscribeToken);
  const text = buildFollowUpEmailText({
    body,
    businessName: organization.name,
    replyEmail: organization.replyEmail,
    businessPhone: organization.businessPhone,
    emailSignature: organization.emailSignature,
    mailingAddress: organization.mailingAddress,
    unsubscribeUrl: unsub,
  });

  const replyTo = replyAddressForQuote(quote.id) ?? organization.replyEmail;
  const html = buildFollowUpEmailHtml({
    subject,
    body,
    businessName: organization.name,
    replyEmail: organization.replyEmail,
    businessPhone: organization.businessPhone,
    emailSignature: organization.emailSignature,
    mailingAddress: organization.mailingAddress,
    unsubscribeUrl: unsub,
    replyTo,
    estimate: {
      quoteNumber: variables.quote_number,
      jobDescription: variables.job_description,
      amount: variables.quote_amount,
      expiresAt: variables.expires_at,
    },
  });

  try {
    const providerMessageId = await sendTransactionalEmail({
      to: customer.email,
      subject,
      text,
      html,
      replyTo,
      headers: {
        "X-QuoteFollow-Quote-Id": quote.id,
        "X-QuoteFollow-Org-Id": organization.id,
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    await db
      .update(scheduledFollowUps)
      .set({
        status: "sent",
        sentAt: new Date(),
        lastError: null,
        providerMessageId,
        processingStartedAt: null,
        nextRetryAt: null,
      })
      .where(eq(scheduledFollowUps.id, claimed.id));

    await db.insert(emailEvents).values({
      organizationId: organization.id,
      scheduledFollowUpId: claimed.id,
      quoteId: quote.id,
      providerMessageId,
      eventType: "sent",
      payload: JSON.stringify({ to: customer.email, subject }),
    });

    await db.insert(conversations).values({
      organizationId: organization.id,
      quoteId: quote.id,
      direction: "outbound",
      subject,
      body,
      fromEmail: organization.replyEmail,
      toEmail: customer.email,
    });

    return { ok: true, scheduledFollowUpId: claimed.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    const attempts = claimed.attemptCount + 1;
    const retryable = isRetryableError(message);
    await db
      .update(scheduledFollowUps)
      .set({
        status: "failed",
        attemptCount: attempts,
        lastError: message,
        processingStartedAt: null,
        nextRetryAt:
          retryable && attempts < MAX_SEND_ATTEMPTS
            ? nextRetryDate(attempts)
            : null,
      })
      .where(eq(scheduledFollowUps.id, claimed.id));
    return { ok: false, reason: message };
  }
}
