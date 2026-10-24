"use client";

import { useTransition } from "react";
import { CreditCard, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  openBillingPortalAction,
  openCancelSubscriptionPortalAction,
  openChangePlanPortalAction,
  openPaymentMethodPortalAction,
} from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

async function goToPortal(
  action: () => Promise<{ url?: string; error?: string }>,
) {
  let result: { url?: string; error?: string };
  try {
    result = await action();
  } catch {
    // A network or server failure shouldn't take the whole page down.
    toast.error("Couldn't reach the billing service. Try again in a moment.");
    return;
  }
  if (result.error) {
    toast.error(result.error);
    return;
  }
  if (result.url) {
    window.location.href = result.url;
  }
}

export function BillingPortalActions({
  hasCustomer,
  hasSubscription,
}: {
  hasCustomer: boolean;
  hasSubscription: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!hasCustomer) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => goToPortal(openBillingPortalAction))
        }
      >
        <ExternalLink className="size-4" />
        Manage in Stripe
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(() => goToPortal(openPaymentMethodPortalAction))
        }
      >
        <CreditCard className="size-4" />
        Update payment method
      </Button>
      {hasSubscription ? (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(() => goToPortal(openChangePlanPortalAction))
            }
          >
            <RefreshCw className="size-4" />
            Change plan
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            className="text-muted-foreground"
            onClick={() =>
              startTransition(() => goToPortal(openCancelSubscriptionPortalAction))
            }
          >
            <XCircle className="size-4" />
            Cancel subscription
          </Button>
        </>
      ) : null}
    </div>
  );
}
