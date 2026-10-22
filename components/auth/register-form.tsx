"use client";

import { useActionState } from "react";

import { registerAction, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required />
          {state.fieldErrors?.name ? (
            <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" autoComplete="organization" placeholder="Morgan Home Services" required />
          {state.fieldErrors?.businessName ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.businessName[0]}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trade">Trade</Label>
        <select
          id="trade"
          name="trade"
          required
          defaultValue="roofing"
          className="form-select h-11 w-full border px-3 py-1 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <option value="roofing">Roofing</option>
          <option value="hvac">HVAC</option>
          <option value="plumbing">Plumbing</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@yourbusiness.com" required />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
