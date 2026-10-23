"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { sendQuoteAction } from "@/lib/actions/quote-follow-ups";
import { Button } from "@/components/ui/button";

export function SendQuoteButton({
  quoteId,
  customerEmail,
  sentAt,
}: {
  quoteId: string;
  customerEmail: string;
  sentAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function send() {
    startTransition(async () => {
      const result = await sendQuoteAction(quoteId);
      setConfirming(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Quote emailed to ${customerEmail}.`);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {sentAt
          ? `Emailed to ${customerEmail} on ${new Date(sentAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`
          : `Not sent to ${customerEmail} yet.`}
      </p>
      {confirming ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs leading-5">
            Send the quote again? Remaining follow-ups will count from now.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={send}>
              {pending ? "Sending…" : "Yes, resend"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="w-full gap-2"
          variant={sentAt ? "outline" : "default"}
          disabled={pending}
          onClick={() => (sentAt ? setConfirming(true) : send())}
        >
          <Send className="size-4" />
          {pending ? "Sending…" : sentAt ? "Resend quote" : "Send quote to customer"}
        </Button>
      )}
    </div>
  );
}
