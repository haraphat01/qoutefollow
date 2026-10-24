"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { assignQuoteAction } from "@/lib/actions/quotes";

export function AssigneeSelect({
  quoteId,
  assignedUserId,
  members,
  currentUserId,
}: {
  quoteId: string;
  assignedUserId: string | null;
  members: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Assigned to"
      className="form-select h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      defaultValue={assignedUserId ?? ""}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value || null;
        startTransition(async () => {
          const result = await assignQuoteAction(quoteId, value);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          const member = members.find((item) => item.id === value);
          toast.success(member ? `Assigned to ${member.id === currentUserId ? "you" : member.name}.` : "Unassigned.");
        });
      }}
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.name}{member.id === currentUserId ? " (you)" : ""}
        </option>
      ))}
    </select>
  );
}
