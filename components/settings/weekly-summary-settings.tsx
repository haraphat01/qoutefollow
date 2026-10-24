"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  sendWeeklySummaryPreviewAction,
  updateWeeklySummaryAction,
} from "@/lib/actions/deliverability";
import { Button } from "@/components/ui/button";

export function WeeklySummarySettings({
  enabled,
  isOwner,
  email,
}: {
  enabled: boolean;
  isOwner: boolean;
  email: string;
}) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={on}
          disabled={!isOwner || pending}
          onChange={(event) => {
            const next = event.target.checked;
            setOn(next);
            startTransition(async () => {
              const result = await updateWeeklySummaryAction(next);
              if (result.error) {
                setOn(!next);
                toast.error(result.error);
                return;
              }
              toast.success(next ? "Weekly summaries are on." : "Weekly summaries are off.");
            });
          }}
        />
        <span>
          <span className="font-medium">Email owners a summary every Monday morning</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Quotes created, sent, won and declined, replies, your open pipeline, and quotes worth a call.
          </span>
        </span>
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await sendWeeklySummaryPreviewAction();
            if (result.error) toast.error(result.error);
            else toast.success(`Preview sent to ${email}.`);
          })
        }
      >
        Send me a preview now
      </Button>
    </div>
  );
}
