"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { AdminActionResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ActionProps = {
  /** A bound server action, e.g. `deleteUserAction.bind(null, id)`. */
  action: () => Promise<AdminActionResult>;
  label: string;
  successMessage: string;
  /** Asks for a second click and explains what will happen. */
  confirm?: string;
  destructive?: boolean;
  /** Where to go afterwards, e.g. when the record no longer exists. */
  redirectTo?: string;
};

export function AdminActionButton({
  action,
  label,
  successMessage,
  confirm,
  destructive,
  redirectTo,
}: ActionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run() {
    startTransition(async () => {
      const result = await action();
      setConfirming(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      if (redirectTo) {
        router.push(redirectTo);
      }
    });
  }

  if (confirm && confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
        <p className="max-w-md text-xs leading-5 text-foreground">{confirm}</p>
        <Button
          type="button"
          size="sm"
          variant={destructive ? "destructive" : "default"}
          disabled={pending}
          onClick={run}
        >
          {pending ? "Working…" : `Yes, ${label.toLowerCase()}`}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={destructive ? "destructive" : "outline"}
      disabled={pending}
      onClick={() => (confirm ? setConfirming(true) : run())}
    >
      {pending ? "Working…" : label}
    </Button>
  );
}

export function BanUserForm({
  action,
  canSuspendWorkspace,
  workspaceName,
}: {
  action: (input: {
    reason: string;
    suspendWorkspace: boolean;
  }) => Promise<AdminActionResult>;
  canSuspendWorkspace: boolean;
  workspaceName: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [suspendWorkspace, setSuspendWorkspace] = useState(canSuspendWorkspace);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await action({ reason, suspendWorkspace });
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("User banned and signed out.");
          setReason("");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="ban-reason">Reason (only admins see this)</Label>
        <Textarea
          id="ban-reason"
          value={reason}
          maxLength={500}
          rows={2}
          placeholder="e.g. Sending spam to customers"
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      {canSuspendWorkspace ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={suspendWorkspace}
            onChange={(event) => setSuspendWorkspace(event.target.checked)}
          />
          <span>
            Also suspend their workspace{workspaceName ? ` "${workspaceName}"` : ""}.
            Teammates are signed out and follow-up emails stop.
          </span>
        </label>
      ) : null}
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Banning…" : "Ban user"}
      </Button>
    </form>
  );
}
