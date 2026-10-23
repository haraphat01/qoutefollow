import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, quotes } from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { suppressEmail } from "@/lib/suppressions";

async function unsubscribe(token: string | null) {
  if (!token) {
    return { ok: false as const, message: "Missing unsubscribe token." };
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return {
      ok: false as const,
      message: "This unsubscribe link is invalid or expired.",
    };
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

  return { ok: true as const };
}

export async function GET(request: Request) {
  const result = await unsubscribe(
    new URL(request.url).searchParams.get("token"),
  );
  if (!result.ok) {
    return htmlResponse(result.message, 400);
  }
  return htmlResponse(
    "You have been unsubscribed from automated follow-up emails for this contractor.",
    200,
  );
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post) from mail clients. */
export async function POST(request: Request) {
  const result = await unsubscribe(
    new URL(request.url).searchParams.get("token"),
  );
  if (!result.ok) {
    return Response.json({ ok: false, error: result.message }, { status: 400 });
  }
  return Response.json({ ok: true });
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
