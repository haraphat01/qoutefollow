"use client";

import { useActionState } from "react";

import { createCustomerAction } from "@/lib/actions/customers";
import type { ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = {};

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomerAction, initialState);

  return (
    <form action={action} className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Customer name</Label>
        <Input id="name" name="name" autoComplete="name" placeholder="e.g. Jordan Miller" required />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(555) 555-0123" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Helpful details about this customer…" />
        </div>
      </div>
      <Button type="submit" size="lg" className="h-11 w-full rounded-xl sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save customer"}
      </Button>
    </form>
  );
}
