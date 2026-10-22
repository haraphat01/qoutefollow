"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateQuoteSequenceAction } from "@/lib/actions/quote-follow-ups";
import { Label } from "@/components/ui/label";

const selectClassName =
  "form-select flex h-11 w-full border px-3 py-1 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

export function QuoteSequenceSelect({
  quoteId,
  currentSequenceId,
  sequences,
  disabled,
}: {
  quoteId: string;
  currentSequenceId: string | null;
  sequences: { id: string; name: string; isDefault: boolean }[];
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Label htmlFor="quoteSequence">Follow-up sequence</Label>
      <select
        id="quoteSequence"
        className={selectClassName}
        disabled={disabled || pending || sequences.length === 0}
        value={currentSequenceId ?? ""}
        onChange={(event) => {
          const sequenceId = event.target.value;
          if (!sequenceId) {
            return;
          }
          startTransition(async () => {
            const result = await updateQuoteSequenceAction(quoteId, sequenceId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Sequence updated; open quote follow-ups were rescheduled.");
          });
        }}
      >
        {sequences.map((sequence) => (
          <option key={sequence.id} value={sequence.id}>
            {sequence.name}
            {sequence.isDefault ? " (default)" : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Changing sequence reschedules pending emails for this quote.
      </p>
    </div>
  );
}
