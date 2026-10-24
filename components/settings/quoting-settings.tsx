"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/auth";
import {
  deletePriceBookItemAction,
  deleteQuoteTemplateAction,
  removeLogoAction,
  savePriceBookItemAction,
  updateQuotingDefaultsAction,
  uploadLogoAction,
} from "@/lib/actions/quoting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function useToastOnSuccess(state: ActionState, message: string, onSuccess?: () => void) {
  useEffect(() => {
    if (state.success) {
      toast.success(message);
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per result
  }, [state]);
}

export function LogoForm({ logoSrc, isOwner }: { logoSrc: string | null; isOwner: boolean }) {
  const [state, action, pending] = useActionState(uploadLogoAction, {});
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useToastOnSuccess(state, "Logo updated.", () => formRef.current?.reset());

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="grid h-20 w-44 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own logo route
          <img src={logoSrc} alt="Your logo" className="max-h-16 max-w-40 object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">No logo yet</span>
        )}
      </div>
      {isOwner ? (
        <form ref={formRef} action={action} className="space-y-2">
          <Input name="logo" type="file" accept="image/png,image/jpeg" required className="max-w-xs" aria-label="Logo image" />
          <p className="text-xs text-muted-foreground">PNG or JPEG, under 1 MB. Shown on quotes, PDFs and customer emails.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Uploading…" : "Upload logo"}</Button>
            {logoSrc ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={removing}
                onClick={() =>
                  startRemove(async () => {
                    const result = await removeLogoAction();
                    if (result.error) toast.error(result.error);
                    else toast.success("Logo removed.");
                  })
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Only the account owner can change the logo.</p>
      )}
    </div>
  );
}

export function DefaultsForm({ defaultTaxRate, isOwner }: { defaultTaxRate: number; isOwner: boolean }) {
  const [state, action, pending] = useActionState(updateQuotingDefaultsAction, {});
  useToastOnSuccess(state, "Default tax rate saved.");
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="defaultTaxRate">Default tax rate (%)</Label>
        <Input id="defaultTaxRate" name="defaultTaxRate" type="number" min="0" max="30" step="0.001" defaultValue={defaultTaxRate} disabled={!isOwner} className="w-36" />
      </div>
      {isOwner ? <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button> : null}
      {state.fieldErrors?.defaultTaxRate ? <p className="w-full text-sm text-destructive">{state.fieldErrors.defaultTaxRate[0]}</p> : null}
      <p className="w-full text-xs text-muted-foreground">Pre-filled on new quotes; you can change it per quote.</p>
    </form>
  );
}

function PriceBookItemForm({
  item,
  onDone,
}: {
  item?: { id: string; name: string; unitPrice: number };
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(savePriceBookItemAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useToastOnSuccess(state, item ? "Item updated." : "Item added to your price book.", () => {
    formRef.current?.reset();
    onDone?.();
  });
  return (
    <form ref={formRef} action={action} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-start">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div>
        <Input name="name" aria-label="Item name" placeholder="e.g. Tear-off, per square" defaultValue={item?.name} maxLength={300} required />
        {state.fieldErrors?.name ? <p className="mt-1 text-xs text-destructive">{state.fieldErrors.name[0]}</p> : null}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input name="unitPrice" aria-label="Unit price" type="number" min="0" step="0.01" placeholder="0.00" defaultValue={item?.unitPrice} className="pl-6" required />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : item ? "Save" : "Add item"}</Button>
        {item ? <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button> : null}
      </div>
    </form>
  );
}

export function PriceBookManager({ items }: { items: { id: string; name: string; unitPrice: number }[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <PriceBookItemForm />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet. Items you add here can be picked while writing a quote.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border/80">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              {editing === item.id ? (
                <PriceBookItemForm item={item} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                  <span className="text-sm tabular-nums">{money.format(item.unitPrice)}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item.id)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${item.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deletePriceBookItemAction(item.id);
                        if (result.error) toast.error(result.error);
                        else toast.success("Item removed.");
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TemplateList({ templates }: { templates: { id: string; name: string; jobDescription: string }[] }) {
  const [pending, startTransition] = useTransition();
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates yet. Open any quote and choose <strong>Save as template</strong> to reuse its job description and items.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border/80">
      {templates.map((template) => (
        <li key={template.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{template.name}</p>
            <p className="truncate text-xs text-muted-foreground">{template.jobDescription}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/quotes/new?templateId=${template.id}`}>Use</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete template ${template.name}`}
            className="text-muted-foreground hover:text-destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteQuoteTemplateAction(template.id);
                if (result.error) toast.error(result.error);
                else toast.success("Template deleted.");
              })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
