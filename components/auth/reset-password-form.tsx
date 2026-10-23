"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { resetPasswordAction, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const isInvite = params.get("invite") === "1";
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  if (!token) {
    return (
      <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        This link is missing its token. Open the link from your email again.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">{isInvite ? "Choose a password" : "New password"}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
        ) : (
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        )}
      </div>
      <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={pending}>
        {pending ? "Saving…" : isInvite ? "Set password and join" : "Save new password"}
      </Button>
    </form>
  );
}
