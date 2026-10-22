"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateQuoteStatusAction } from "@/lib/actions/quotes";
import type { quotes } from "@/lib/db/schema";

const ACTIONS: {
  label: string;
  status: (typeof quotes.$inferSelect)["status"];
  variant?: "default" | "secondary" | "outline" | "destructive";
}[] = [
  { label: "Keep open", status: "pending" },
  { label: "Mark accepted", status: "accepted" },
  { label: "Mark declined", status: "declined", variant: "destructive" },
  { label: "Pause follow-ups", status: "paused", variant: "secondary" },
  { label: "Cancel quote", status: "cancelled", variant: "destructive" },
];

export function QuoteStatusActions({
  quoteId,
  status,
}: {
  quoteId: string;
  status: (typeof quotes.$inferSelect)["status"];
}) {
  const [pending, startTransition] = useTransition();

  function onSelect(next: (typeof quotes.$inferSelect)["status"]) {
    startTransition(async () => {
      const result = await updateQuoteStatusAction(quoteId, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Quote marked ${next}.`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.status}
            type="button"
            variant={status === action.status ? "default" : action.variant ?? "outline"}
            aria-pressed={status === action.status}
            disabled={pending || status === action.status}
            onClick={() => onSelect(action.status)}
            className="h-10 w-full justify-start px-3"
          >
            {action.label}
          </Button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Accepted, declined, or cancelled quotes stop their follow-up schedule.
      </p>
    </div>
  );
}
