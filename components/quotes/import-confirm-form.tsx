"use client";

import { useActionState } from "react";

import { confirmImportedQuoteAction } from "@/lib/actions/pdf-import";
import type { ActionState } from "@/lib/actions/auth";
import type { ExtractedQuoteFields } from "@/lib/ai/extract-quote-fields";
import { LineItemsEditor } from "@/components/quotes/line-items-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "form-select flex h-11 w-full border px-3 py-1 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

const initialState: ActionState = {};

export function ImportConfirmForm({
  documentId,
  fileName,
  extractionError,
  fields,
}: {
  documentId: string;
  fileName: string;
  extractionError?: string | null;
  fields: ExtractedQuoteFields;
}) {
  const [state, action, pending] = useActionState(
    confirmImportedQuoteAction,
    initialState,
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="documentId" value={documentId} />

      {extractionError ? (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          We couldn’t extract every detail ({extractionError}). Review and correct each field before saving.
        </p>
      ) : (
        <p className="rounded-xl border border-border bg-muted/45 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Review the details extracted from <span className="font-semibold text-foreground">{fileName}</span>. Extraction confidence: <span className="font-semibold capitalize text-foreground">{fields.confidence}</span>. Correct anything that looks off.
        </p>
      )}

      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Customer</h2>
          <p className="mt-1 text-xs text-muted-foreground">Confirm who this estimate belongs to.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer name</Label>
            <Input id="customerName" name="customerName" autoComplete="name" required defaultValue={fields.customerName ?? ""} />
            {state.fieldErrors?.customerName ? <p className="text-sm text-destructive">{state.fieldErrors.customerName[0]}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Customer email</Label>
            <Input id="customerEmail" name="customerEmail" type="email" autoComplete="email" required defaultValue={fields.customerEmail ?? ""} />
            {state.fieldErrors?.customerEmail ? <p className="text-sm text-destructive">{state.fieldErrors.customerEmail[0]}</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border/70 pt-6">
        <div>
          <h2 className="text-sm font-semibold">Estimate</h2>
          <p className="mt-1 text-xs text-muted-foreground">Check the amounts and job details against the original PDF. Split the total into items if you like.</p>
        </div>
        <div className="space-y-2 sm:max-w-sm">
          <Label htmlFor="estimateNumber">Estimate / quote number <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="estimateNumber" name="estimateNumber" defaultValue={fields.estimateNumber ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea id="jobDescription" name="jobDescription" rows={3} required defaultValue={fields.jobDescription ?? ""} />
          {state.fieldErrors?.jobDescription ? <p className="text-sm text-destructive">{state.fieldErrors.jobDescription[0]}</p> : null}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Items</p>
          <LineItemsEditor
            initialItems={[
              {
                description: (fields.jobDescription ?? "Estimate total").slice(0, 300),
                quantity: 1,
                unitPrice: fields.amount ?? "",
              },
            ]}
            error={state.fieldErrors?.lineItems?.[0]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quoteDate">Quote date</Label>
            <Input id="quoteDate" name="quoteDate" type="date" required defaultValue={fields.quoteDate ?? today} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration date <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="expiresAt" name="expiresAt" type="date" defaultValue={fields.expirationDate ?? ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Internal notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={fields.notes ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Quote status after saving</Label>
          <select id="status" name="status" className={selectClassName} defaultValue="pending">
            <option value="draft">Save as draft</option>
            <option value="pending">Open and queue follow-ups</option>
          </select>
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-muted/45 p-4">
        <input
          id="followUpsEnabled"
          type="checkbox"
          name="followUpsEnabled"
          defaultChecked
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          <span className="block text-sm font-semibold">Enable quote follow-ups</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Queue the default sequence’s emails after saving.</span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-[#f1f6ef] p-4">
        <input
          id="contactConfirmed"
          type="checkbox"
          name="contactConfirmed"
          required
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          <span className="block text-sm font-semibold">I’ve verified this customer’s contact details</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Confirm the name and email against the original estimate before saving.</span>
        </span>
      </label>
      {state.fieldErrors?.contactConfirmed ? (
        <p className="text-sm text-destructive">
          {state.fieldErrors.contactConfirmed[0]}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="h-11 w-full rounded-xl sm:w-auto" disabled={pending}>
        {pending ? "Saving quote…" : "Confirm and save quote"}
      </Button>
    </form>
  );
}
