"use client";

import { useActionState } from "react";

import { updateQuoteAction } from "@/lib/actions/quotes";
import type { ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = {};

export function QuoteEditForm({
  quote,
}: {
  quote: {
    id: string;
    amount: string;
    jobDescription: string;
    quoteDate: string;
    expiresAt: string;
    notes: string;
    followUpsEnabled: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateQuoteAction, initialState);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="quoteId" value={quote.id} />
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Quote amount (USD)</Label>
          <Input id="amount" name="amount" type="number" min="1" step="0.01" inputMode="decimal" required defaultValue={quote.amount} />
          {state.fieldErrors?.amount ? (
            <p className="text-sm text-destructive">{state.fieldErrors.amount[0]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="quoteDate">Quote date</Label>
          <Input id="quoteDate" name="quoteDate" type="date" required defaultValue={quote.quoteDate} />
          {state.fieldErrors?.quoteDate ? (
            <p className="text-sm text-destructive">{state.fieldErrors.quoteDate[0]}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="jobDescription">Job description</Label>
        <Textarea id="jobDescription" name="jobDescription" rows={4} required defaultValue={quote.jobDescription} />
        {state.fieldErrors?.jobDescription ? (
          <p className="text-sm text-destructive">{state.fieldErrors.jobDescription[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiresAt">Expiration date <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="expiresAt" name="expiresAt" type="date" defaultValue={quote.expiresAt} className="sm:max-w-xs" />
        <p className="text-xs text-muted-foreground">Moving the date forward reopens an expired quote.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Internal notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={quote.notes} />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/55 p-4">
        <input
          id="followUpsEnabled"
          type="checkbox"
          name="followUpsEnabled"
          defaultChecked={quote.followUpsEnabled}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <div>
          <Label htmlFor="followUpsEnabled" className="cursor-pointer">Send automated follow-ups for this quote</Label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Turning this off cancels any queued emails. Turning it back on re-queues the remaining steps for open quotes.</p>
        </div>
      </div>

      <Button type="submit" disabled={pending} size="lg" className="h-11 w-full rounded-xl sm:w-auto">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
