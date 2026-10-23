"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/auth";
import {
  addTeamMemberAction,
  changePasswordAction,
  removeTeamMemberAction,
  resendTeamInviteAction,
} from "@/lib/actions/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  invitePending: boolean;
};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="text-sm text-destructive">{errors[0]}</p>
  ) : null;
}

export function TeamMemberList({
  members,
  currentUserId,
  isOwner,
}: {
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="divide-y divide-border rounded-xl border border-border/80">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              {member.name}
              {member.id === currentUserId ? (
                <span className="text-xs font-normal text-muted-foreground">(you)</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {member.email} · mention as @{member.name.trim().split(/\s+/)[0]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {member.invitePending ? (
              <Badge variant="outline">Invite pending</Badge>
            ) : null}
            <Badge variant={member.role === "owner" ? "default" : "secondary"} className="capitalize">
              {member.role}
            </Badge>
            {isOwner && member.invitePending ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await resendTeamInviteAction(member.id);
                    if (result.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(`Invite re-sent to ${member.email}.`);
                  });
                }}
              >
                Resend invite
              </Button>
            ) : null}
            {isOwner && member.role !== "owner" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await removeTeamMemberAction(member.id);
                    if (result.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(`${member.name} was removed.`);
                  });
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AddTeamMemberForm({ inviteByEmail }: { inviteByEmail: boolean }) {
  const [state, action, pending] = useActionState(addTeamMemberAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(
        inviteByEmail
          ? "Invite sent. They'll set their own password from the email."
          : "Teammate added. Share their temporary password with them.",
      );
      formRef.current?.reset();
    }
  }, [state, inviteByEmail]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className={`grid gap-4 ${inviteByEmail ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div className="space-y-2">
          <Label htmlFor="member-name">Name</Label>
          <Input id="member-name" name="name" required />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-email">Email</Label>
          <Input id="member-email" name="email" type="email" required />
          <FieldError errors={state.fieldErrors?.email} />
        </div>
        {inviteByEmail ? null : (
          <div className="space-y-2">
            <Label htmlFor="member-password">Temporary password</Label>
            <Input id="member-password" name="password" type="text" minLength={8} autoComplete="off" required />
            <FieldError errors={state.fieldErrors?.password} />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {inviteByEmail
          ? "We'll email them a link to set their password and join. The link lasts 7 days."
          : "Email isn't configured, so they sign in with this password and change it under Team."}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : inviteByEmail ? "Send invite" : "Add teammate"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Password updated.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="max-w-md space-y-4">
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        <FieldError errors={state.fieldErrors?.currentPassword} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
        <FieldError errors={state.fieldErrors?.newPassword} />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
