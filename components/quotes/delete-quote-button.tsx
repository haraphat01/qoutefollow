"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteQuoteAction } from "@/lib/actions/quotes";
import { Button } from "@/components/ui/button";

export function DeleteQuoteButton({
  quoteId,
  quoteNumber,
  sent,
  accepted,
}: {
  quoteId: string;
  quoteNumber: string;
  sent: boolean;
  accepted: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" className="gap-2" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete quote
      </Button>
    );
  }

  const warning = accepted
    ? " The customer accepted this quote, so you'll lose the signed record."
    : sent
      ? " It's already been emailed; the customer's link will stop working."
      : "";

  return (
    <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm leading-6">
        Permanently delete <strong>{quoteNumber}</strong> with its follow-ups, email history and notes?{warning} The customer is kept. This can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteQuoteAction(quoteId);
              // On success the action redirects to the quote list.
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
