import { getStripe } from "@/lib/billing/stripe";
import { handleStripeWebhookEvent } from "@/lib/webhooks/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response("Webhook not configured", { status: 400 });
  }

  const payload = await request.text();

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    await handleStripeWebhookEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return Response.json({ error: message }, { status: 400 });
  }
}
