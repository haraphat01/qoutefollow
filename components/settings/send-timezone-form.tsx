"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateSendTimezoneAction } from "@/lib/actions/deliverability";
import { SEND_TIMEZONE_OPTIONS } from "@/lib/follow-ups/send-window";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SendTimezoneForm({
  sendTimezone,
  isOwner,
}: {
  sendTimezone: string;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the account owner can change send windows. Follow-ups send Mon–Fri,
        8am–6pm in {sendTimezone}.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateSendTimezoneAction({}, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          if (result.fieldErrors?.sendTimezone) {
            toast.error(result.fieldErrors.sendTimezone[0]);
            return;
          }
          toast.success("Send window timezone saved.");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="sendTimezone">Business hours timezone</Label>
        <select
          id="sendTimezone"
          name="sendTimezone"
          defaultValue={sendTimezone}
          required
          className={cn(
            "flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {SEND_TIMEZONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Automated follow-ups only send Monday–Friday, 8:00am–6:00pm in this
          timezone. Messages due overnight or on weekends roll to the next valid
          slot.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save timezone"}
      </Button>
    </form>
  );
}
