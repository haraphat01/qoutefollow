"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  openChangePlanPortalAction,
  startCheckoutAction,
} from "@/lib/actions/billing";
import { Check } from "lucide-react";

import { PLAN_BENEFITS, PLAN_CATALOG, TRIAL_DAYS } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plan = PLAN_CATALOG.starter;

export function PlanPicker({
  hasActiveSubscription,
  freeTrial,
}: {
  hasActiveSubscription: boolean;
  /** Set while on the free trial (no subscription yet). */
  freeTrial: { endsOn: string; keepsTrial: boolean } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  // Being on the free trial isn't being subscribed: trial users can upgrade.
  const isCurrent = hasActiveSubscription;


  async function subscribe() {
    setLoading(true);

    if (hasActiveSubscription) {
      const result = await openChangePlanPortalAction();
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
      setLoading(false);
      return;
    }

    const result = await startCheckoutAction("starter");
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
    setLoading(false);
  }

  return (
    <Card className={isCurrent ? "border-primary" : ""}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>
          {TRIAL_DAYS}-day free trial with full access, then ${plan.priceMonthly}
          /mo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {PLAN_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <p className="text-2xl font-semibold">
          ${plan.priceMonthly}
          <span className="text-sm font-normal text-muted-foreground">
            /mo after trial
          </span>
        </p>
        <Button
          type="button"
          className="w-full"
          variant={isCurrent ? "secondary" : "default"}
          disabled={pending || isCurrent}
          onClick={() => {
            startTransition(() => subscribe());
          }}
        >
          {isCurrent
            ? "Current plan"
            : loading
              ? "Opening…"
              : freeTrial
                ? "Upgrade now"
                : "Subscribe"}
        </Button>
        {freeTrial && !isCurrent ? (
          <p className="text-center text-xs text-muted-foreground">
            {freeTrial.keepsTrial
              ? `You keep your free trial: the first charge is on ${freeTrial.endsOn}, when it ends.`
              : "Your trial ends within two days, so billing starts today."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
