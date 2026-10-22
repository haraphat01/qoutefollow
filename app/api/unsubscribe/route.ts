import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, quotes } from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { suppressEmail } from "@/lib/suppressions";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return htmlResponse("Missing unsubscribe token.", 400);
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return htmlResponse("This unsubscribe link is invalid or expired.", 400);
  }

  await suppressEmail({
    organizationId: payload.organizationId,
    email: payload.email,
    reason: "unsubscribed",
  });

  const customerQuotes = await db
    .select({ id: quotes.id })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(quotes.organizationId, payload.organizationId),
        eq(customers.email, payload.email),
      ),
    );

  for (const quote of customerQuotes) {
    await cancelScheduledFollowUpsForQuote(quote.id);
  }

  return htmlResponse(
    "You have been unsubscribed from automated follow-up emails for this contractor.",
    200,
  );
}

function htmlResponse(message: string, status: number) {
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;padding:2rem;max-width:40rem"><h1>Unsubscribed</h1><p>${message}</p></body></html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}
