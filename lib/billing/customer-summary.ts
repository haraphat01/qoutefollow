import type Stripe from "stripe";

import { getStripe } from "./stripe";

export type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  currency: string;
  created: Date;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
};

export type BillingSubscriptionSummary = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  priceId: string | null;
  unitAmount: number | null;
  currency: string | null;
  interval: string | null;
};

export type CustomerBillingSummary = {
  subscription: BillingSubscriptionSummary | null;
  invoices: BillingInvoice[];
  defaultPaymentMethod: {
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
  } | null;
};

export async function getCustomerBillingSummary(
  customerId: string,
): Promise<CustomerBillingSummary | null> {
  const stripe = getStripe();

  const [customer, subscriptions, invoices] = await Promise.all([
    stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    }),
    stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    }),
    stripe.invoices.list({
      customer: customerId,
      limit: 5,
    }),
  ]);

  if (customer.deleted) {
    return null;
  }

  const subscription = subscriptions.data[0] as
    | (Stripe.Subscription & { current_period_end?: number })
    | undefined;
  const price = subscription?.items.data[0]?.price;

  let defaultPaymentMethod: CustomerBillingSummary["defaultPaymentMethod"] = null;
  const pm = customer.invoice_settings?.default_payment_method;
  if (pm && typeof pm === "object" && pm.object === "payment_method") {
    const card = pm.card;
    defaultPaymentMethod = {
      brand: card?.brand ?? null,
      last4: card?.last4 ?? null,
      expMonth: card?.exp_month ?? null,
      expYear: card?.exp_year ?? null,
    };
  }

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          priceId: price?.id ?? null,
          unitAmount: price?.unit_amount ?? null,
          currency: price?.currency ?? null,
          interval: price?.recurring?.interval ?? null,
        }
      : null,
    invoices: invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      created: new Date(invoice.created * 1000),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    })),
    defaultPaymentMethod,
  };
}
