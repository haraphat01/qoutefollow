"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { acceptQuoteAction, type AcceptState } from "@/lib/actions/public-quote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptQuoteForm({
  publicToken,
  options,
  businessName,
}: {
  publicToken: string;
  options: { name: string | null; total: string }[];
  businessName: string;
}) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(
    acceptQuoteAction.bind(null, publicToken),
    {},
  );
  const [optionIndex, setOptionIndex] = useState(options.length > 1 ? -1 : 0);

  if (state.accepted) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <p>Thank you! Your acceptance is recorded and {businessName} has been notified. A signed copy is on its way to your inbox.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {options.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Choose your option</legend>
          {options.map((option, index) => (
            <label
              key={index}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-colors ${
                optionIndex === index ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="optionIndex"
                  value={index}
                  checked={optionIndex === index}
                  onChange={() => setOptionIndex(index)}
                  className="size-4 accent-primary"
                  required
                />
                <span className="font-medium">{option.name}</span>
              </span>
              <span className="font-semibold tabular-nums">{option.total}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="optionIndex" value="0" />
      )}
      <div className="space-y-2">
        <Label htmlFor="signerName">Type your full name to sign</Label>
        <Input id="signerName" name="signerName" autoComplete="name" required minLength={2} maxLength={100} placeholder="e.g. Jordan Miller" className="h-11 font-medium" />
      </div>
      <label className="flex items-start gap-2.5 text-sm leading-relaxed">
        <input type="checkbox" name="agree" required className="mt-1 size-4 shrink-0 accent-primary" />
        <span>
          I accept this estimate{optionIndex >= 0 && options[optionIndex] ? ` (${options[optionIndex].total})` : ""} and authorize {businessName} to proceed. Typing my name counts as my signature.
        </span>
      </label>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending || optionIndex < 0}>
        {pending ? "Recording your acceptance…" : "Accept & sign"}
      </Button>
    </form>
  );
}
