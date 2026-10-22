"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateQuoteStatusAction } from "@/lib/actions/quotes";
import { formatClassificationLabel } from "@/lib/replies/classification-labels";
import { Button } from "@/components/ui/button";

type QuoteStatus =
  | "draft"
  | "pending"
  | "paused"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export function ReplyIntelligenceBanner({
  quoteId,
  currentStatus,
  classification,
  suggestedStatus,
  summary,
}: {
  quoteId: string;
  currentStatus: QuoteStatus;
  classification: string | null;
  suggestedStatus: string | null;
  summary: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (!classification && !summary) {
    return null;
  }

  const label = formatClassificationLabel(classification);
  const canApply =
    suggestedStatus &&
    suggestedStatus !== currentStatus &&
    ["accepted", "declined", "paused", "pending"].includes(suggestedStatus);

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
      <p className="font-semibold text-foreground">Reply intelligence</p>
      {label ? (
        <p className="mt-1 text-muted-foreground">{label}</p>
      ) : null}
      {summary ? <p className="mt-2 leading-relaxed">{summary}</p> : null}
      {canApply ? (
        <Button
          type="button"
          size="sm"
          className="mt-3"
          variant="outline"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await updateQuoteStatusAction(
                quoteId,
                suggestedStatus as QuoteStatus,
              );
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(`Quote marked ${suggestedStatus}.`);
            });
          }}
        >
          Apply suggested status: {suggestedStatus}
        </Button>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Suggestions only — you stay in control. No auto-discounts or
        negotiations.
      </p>
    </div>
  );
}
