"use client";

import { useActionState } from "react";
import Link from "next/link";

import { createQuoteAction } from "@/lib/actions/quotes";
import type { ActionState } from "@/lib/actions/auth";
import { LineItemsEditor } from "@/components/quotes/line-items-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "form-select flex h-11 w-full border px-3 py-1 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

type CustomerOption = { id: string; name: string; email: string };
type SequenceOption = { id: string; name: string; isDefault: boolean };

const initialState: ActionState = {};

export function QuoteForm({
  customers,
  sequences,
  defaultCustomerId,
}: {
  customers: CustomerOption[];
  sequences: SequenceOption[];
  defaultCustomerId?: string;
}) {
  const defaultSequenceId =
    sequences.find((s) => s.isDefault)?.id ?? sequences[0]?.id ?? "";
  const [state, action, pending] = useActionState(createQuoteAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-7">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Customer</h2>
          <p className="mt-1 text-xs text-muted-foreground">Choose someone in your directory or add their details here.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerId">Select existing customer <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <select id="customerId" name="customerId" className={selectClassName} defaultValue={defaultCustomerId ?? ""}>
            <option value="">Choose a customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} · {customer.email}
              </option>
            ))}
          </select>
          {customers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No customers saved yet. You can add one in this form or <Link href="/customers/new" className="font-semibold text-primary hover:underline">create a customer first</Link>.</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">New customer name</Label>
            <Input id="customerName" name="customerName" autoComplete="name" placeholder="e.g. Jordan Miller" />
            {state.fieldErrors?.customerName ? (
              <p className="text-sm text-destructive">{state.fieldErrors.customerName[0]}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">New customer email</Label>
            <Input id="customerEmail" name="customerEmail" type="email" autoComplete="email" placeholder="name@example.com" />
            {state.fieldErrors?.customerEmail ? (
              <p className="text-sm text-destructive">{state.fieldErrors.customerEmail[0]}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border/70 pt-6">
        <div>
          <h2 className="text-sm font-semibold">Estimate</h2>
          <p className="mt-1 text-xs text-muted-foreground">Summarize the job, then list each item. The total is calculated for you.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea id="jobDescription" name="jobDescription" rows={3} placeholder="e.g. Full roof replacement, 2,400 sq ft" required />
          {state.fieldErrors?.jobDescription ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.jobDescription[0]}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Items</p>
          <LineItemsEditor error={state.fieldErrors?.lineItems?.[0]} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="quoteDate">Quote date</Label>
            <Input
              id="quoteDate"
              name="quoteDate"
              type="date"
              defaultValue={today}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration date <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="expiresAt" name="expiresAt" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Starting status</Label>
            <select id="status" name="status" className={selectClassName} defaultValue="pending">
              <option value="draft">Draft — don’t schedule follow-ups</option>
              <option value="pending">Open — schedule follow-ups</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Internal notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Anything your team should remember…" />
        </div>
      </section>

      {sequences.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="sequenceId">Follow-up sequence</Label>
          <select
            id="sequenceId"
            name="sequenceId"
            className={selectClassName}
            defaultValue={defaultSequenceId}
          >
            {sequences.map((sequence) => (
              <option key={sequence.id} value={sequence.id}>
                {sequence.name}
                {sequence.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
        <input
          id="sendNow"
          type="checkbox"
          name="sendNow"
          defaultChecked
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <div>
          <Label htmlFor="sendNow" className="cursor-pointer">Email this quote to the customer now</Label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">They get an itemized estimate from your business with a reply button. Follow-ups count from when it&apos;s sent. Untick to save it and send later.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/55 p-4">
        <input
          id="followUpsEnabled"
          type="checkbox"
          name="followUpsEnabled"
          defaultChecked
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <div>
          <Label htmlFor="followUpsEnabled" className="cursor-pointer">Enable quote follow-ups</Label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Send the emails in the selected sequence. They stop when the quote is closed or cancelled.</p>
        </div>
      </div>
      <Button type="submit" disabled={pending} size="lg" className="h-11 w-full rounded-xl sm:w-auto">
        {pending ? "Saving quote…" : "Save quote"}
      </Button>
    </form>
  );
}
