import {
  handleResendWebhookEvent,
  verifyResendWebhook,
} from "@/lib/webhooks/resend";

export async function POST(request: Request) {
  const payload = await request.text();

  try {
    const event = verifyResendWebhook(payload, {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    });

    const result = await handleResendWebhookEvent(event);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
