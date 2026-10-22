"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function BillingAlerts({
  checkout,
  portal,
}: {
  checkout?: string | null;
  portal?: string | null;
}) {
  useEffect(() => {
    if (checkout === "success") {
      toast.success("Subscription updated. Your plan may take a moment to sync.");
    } else if (checkout === "cancel") {
      toast.message("Checkout canceled — no changes were made.");
    } else if (portal === "returned") {
      toast.message("Welcome back. Billing changes may take a moment to appear.");
    }
  }, [checkout, portal]);

  return null;
}
