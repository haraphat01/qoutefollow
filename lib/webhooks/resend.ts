import { Webhook } from "svix";

import { getReceivedEmail, htmlToPlainText } from "@/lib/email/resend";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { handleCustomerReply } from "@/lib/replies/handle-customer-reply";
import { resolveQuoteFromInboundEmail } from "@/lib/replies/resolve-quote";
import { suppressEmail } from "@/lib/suppressions";
import { and, eq, gt } from "drizzle-orm";

type ResendWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

export function verifyResendWebhook(
  payload: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  }

  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new Error("Missing Svix headers");
  }

  const wh = new Webhook(secret);
  // svix 2.x verify() throws on a bad signature and returns nothing.
  wh.verify(payload, {
    "svix-id": headers.id,
    "svix-timestamp": headers.timestamp,
    "svix-signature": headers.signature,
  });

  return JSON.parse(payload) as ResendWebhookEvent;
}

export async function handleResendWebhookEvent(event: ResendWebhookEvent) {
  const data = event.data;
  const providerMessageId =
    (data.email_id as string | undefined) ??
    (data.id as string | undefined) ??
    null;

  if (event.type === "email.bounced" || event.type === "email.complained") {
    if (!providerMessageId) {
      return { ok: true, handled: false };
    }

    const [sentEvent] = await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.providerMessageId, providerMessageId))
      .limit(1);

    if (!sentEvent?.quoteId) {
      return { ok: true, handled: false };
    }

    const payload = JSON.parse(sentEvent.payload ?? "{}") as { to?: string };
    const email = payload.to;
    if (email) {
      await suppressEmail({
        organizationId: sentEvent.organizationId,
        email,
        reason: event.type === "email.bounced" ? "bounced" : "complained",
        sourceQuoteId: sentEvent.quoteId,
      });
    }

    await cancelScheduledFollowUpsForQuote(sentEvent.quoteId);

    await db.insert(emailEvents).values({
      organizationId: sentEvent.organizationId,
      quoteId: sentEvent.quoteId,
      scheduledFollowUpId: sentEvent.scheduledFollowUpId,
      providerMessageId,
      eventType: event.type === "email.bounced" ? "bounced" : "complained",
      payload: JSON.stringify(data),
    });

    return { ok: true, handled: true, type: event.type };
  }

  if (event.type === "email.delivered" && providerMessageId) {
    const [sentEvent] = await db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.providerMessageId, providerMessageId))
      .limit(1);

    if (sentEvent) {
      await db.insert(emailEvents).values({
        organizationId: sentEvent.organizationId,
        quoteId: sentEvent.quoteId,
        scheduledFollowUpId: sentEvent.scheduledFollowUpId,
        providerMessageId,
        eventType: "delivered",
        payload: JSON.stringify(data),
      });
    }

    return { ok: true, handled: Boolean(sentEvent) };
  }

  // Needs open/click tracking switched on for the sending domain in Resend.
  if ((event.type === "email.opened" || event.type === "email.clicked") && providerMessageId) {
    const eventType = event.type === "email.opened" ? "opened" : "clicked";
    const [sentEvent] = await db
      .select()
      .from(emailEvents)
      .where(and(eq(emailEvents.providerMessageId, providerMessageId), eq(emailEvents.eventType, "sent")))
      .limit(1);
    if (!sentEvent) {
      return { ok: true, handled: false };
    }

    // Mail apps re-open messages constantly; count one per message per hour.
    const [recent] = await db
      .select({ id: emailEvents.id })
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.providerMessageId, providerMessageId),
          eq(emailEvents.eventType, eventType),
          gt(emailEvents.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
        ),
      )
      .limit(1);
    if (!recent) {
      const click = (data.click as { link?: string } | undefined)?.link;
      await db.insert(emailEvents).values({
        organizationId: sentEvent.organizationId,
        quoteId: sentEvent.quoteId,
        scheduledFollowUpId: sentEvent.scheduledFollowUpId,
        providerMessageId,
        eventType,
        payload: JSON.stringify(click ? { link: click } : {}),
      });
    }
    return { ok: true, handled: true, type: event.type };
  }

  if (event.type === "email.received") {
    if (providerMessageId) {
      // Webhooks are retried; never record the same inbound reply twice.
      const [alreadyHandled] = await db
        .select({ id: emailEvents.id })
        .from(emailEvents)
        .where(
          and(
            eq(emailEvents.providerMessageId, providerMessageId),
            eq(emailEvents.eventType, "received"),
          ),
        )
        .limit(1);
      if (alreadyHandled) {
        return { ok: true, handled: false, reason: "duplicate" };
      }
    }

    let from = (data.from as string | undefined) ?? "";
    let subject = (data.subject as string | undefined) ?? null;
    let text =
      (data.text as string | undefined) ??
      (data.html ? htmlToPlainText(data.html as string) : "");
    let headers = (data.headers as Record<string, string> | undefined) ?? {};
    const toAddresses = [
      ...((data.to as string[] | undefined) ?? []),
      ...((data.received_for as string[] | undefined) ?? []),
    ];

    // Resend's email.received payload has no body; load the full message.
    if (!text && providerMessageId) {
      const full = await getReceivedEmail(providerMessageId);
      if (full) {
        from = full.from || from;
        subject = full.subject ?? subject;
        text = full.text ?? (full.html ? htmlToPlainText(full.html) : "");
        headers = full.headers ?? headers;
        toAddresses.push(...(full.to ?? []), ...(full.received_for ?? []));
      }
    }

    const headerValue = (name: string) =>
      Object.entries(headers).find(
        ([key]) => key.toLowerCase() === name,
      )?.[1] ?? null;

    const resolved = await resolveQuoteFromInboundEmail({
      fromEmail: from,
      inReplyTo: headerValue("in-reply-to"),
      references: headerValue("references"),
      toAddresses,
      subject,
    });

    if (!resolved?.quoteId) {
      return { ok: true, handled: false, reason: "quote_not_resolved" };
    }

    const result = await handleCustomerReply({
      organizationId: resolved.organizationId,
      quoteId: resolved.quoteId,
      fromEmail: from,
      subject,
      body: text.slice(0, 20_000),
    });

    if (providerMessageId) {
      await db.insert(emailEvents).values({
        organizationId: resolved.organizationId,
        quoteId: resolved.quoteId,
        providerMessageId,
        eventType: "received",
        payload: JSON.stringify(data),
      });
    }

    return { ok: true, handled: result.handled, type: "email.received" };
  }

  return { ok: true, handled: false, type: event.type };
}
