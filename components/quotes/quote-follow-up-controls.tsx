"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  sendNextFollowUpNowAction,
  snoozeNextFollowUpAction,
} from "@/lib/actions/quote-follow-ups";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function QuoteFollowUpControls({
  quoteId,
  nextScheduledAt,
  nextScheduledId,
  timeZone,
}: {
  quoteId: string;
  nextScheduledAt: string | null;
  nextScheduledId: string | null;
  timeZone: string;
}) {
  const [pending, startTransition] = useTransition();
  const [snoozeValue, setSnoozeValue] = useState("");

  if (!nextScheduledId || !nextScheduledAt) {
    return (
      <p className="text-sm text-muted-foreground">
        No upcoming automated email to send or reschedule.
      </p>
    );
  }

  const defaultSnooze = new Date(nextScheduledAt);
  defaultSnooze.setDate(defaultSnooze.getDate() + 2);
  // datetime-local inputs take local wall-clock time, not UTC.
  const snoozeDefault = snoozeValue || toLocalDateTimeInput(defaultSnooze);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Next email: {formatDateTime(nextScheduledAt, timeZone)}
      </p>
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await sendNextFollowUpNowAction(quoteId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Follow-up sent.");
          });
        }}
      >
        {pending ? "Sending…" : "Send next follow-up now"}
      </Button>

      <div className="space-y-2 border-t border-border/70 pt-4">
        <Label htmlFor="snooze-until">Snooze next touch</Label>
        <Input
          id="snooze-until"
          type="datetime-local"
          value={snoozeDefault}
          onChange={(event) => setSnoozeValue(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const iso = new Date(snoozeDefault).toISOString();
              const result = await snoozeNextFollowUpAction(quoteId, iso);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success("Next follow-up rescheduled.");
            });
          }}
        >
          Reschedule next email
        </Button>
        <p className="text-xs text-muted-foreground">
          Only moves the next scheduled email — your sequence templates stay the
          same.
        </p>
      </div>
    </div>
  );
}
