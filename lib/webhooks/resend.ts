import { Webhook } from "svix";

import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { handleCustomerReply } from "@/lib/replies/handle-customer-reply";
import { resolveQuoteFromInboundEmail } from "@/lib/replies/resolve-quote";
import { suppressEmail } from "@/lib/suppressions";
import { eq } from "drizzle-orm";

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
  const verified = wh.verify(payload, {
    "svix-id": headers.id,
    "svix-timestamp": headers.timestamp,
    "svix-signature": headers.signature,
  });

  return verified as unknown as ResendWebhookEvent;
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

  if (event.type === "email.received") {
    const from = (data.from as string | undefined) ?? "";
    const subject = (data.subject as string | undefined) ?? null;
    const text =
      (data.text as string | undefined) ??
      (data.html as string | undefined) ??
      "";
    const headers = (data.headers as Record<string, string> | undefined) ?? {};

    const resolved = await resolveQuoteFromInboundEmail({
      inReplyTo: headers["in-reply-to"] ?? headers["In-Reply-To"] ?? null,
      references: headers.references ?? headers.References ?? null,
      toAddresses: (data.to as string[] | undefined) ?? [],
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
