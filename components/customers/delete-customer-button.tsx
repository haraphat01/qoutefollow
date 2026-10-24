"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCustomerAction } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";

export function DeleteCustomerButton({
  customerId,
  customerName,
  quoteCount,
  acceptedCount,
}: {
  customerId: string;
  customerName: string;
  quoteCount: number;
  acceptedCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const consequence =
    quoteCount === 0
      ? "They have no quotes."
      : `Their ${quoteCount} ${quoteCount === 1 ? "quote" : "quotes"}${
          acceptedCount > 0 ? `, including ${acceptedCount} accepted,` : ""
        } will be deleted too, with all follow-ups, emails and notes.`;

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" className="gap-2" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete customer
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm leading-6">
        Permanently delete <strong>{customerName}</strong>? {consequence} This can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteCustomerAction(customerId);
              // On success the action redirects to the customer list.
              if (result?.error) {
                toast.error(result.error);
                setConfirming(false);
              }
            })
          }
        >
          {pending ? "Deleting…" : "Yes, delete permanently"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
