"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDefaultSequenceAction } from "@/lib/actions/sequences";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/email/template-variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SequenceStepInput = {
  id: string;
  dayOffset: number;
  subject: string;
  bodyTemplate: string;
  sortOrder: number;
};

export function SequenceEditor({
  sequenceId,
  steps: initialSteps,
}: {
  sequenceId: string;
  steps: SequenceStepInput[];
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [pending, startTransition] = useTransition();

  function updateStep(
    index: number,
    patch: Partial<Pick<SequenceStepInput, "dayOffset" | "subject" | "bodyTemplate">>,
  ) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  function save() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sequenceId", sequenceId);
      formData.set(
        "steps",
        JSON.stringify(
          steps.map((step) => ({
            id: step.id,
            dayOffset: step.dayOffset,
            subject: step.subject,
            bodyTemplate: step.bodyTemplate,
          })),
        ),
      );

      const result = await updateDefaultSequenceAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.fieldErrors) {
        toast.error("Check the highlighted fields and try again.");
        return;
      }
      toast.success("Follow-up sequence saved. Open quotes were rescheduled.");
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Use merge tags like{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          {"{{customer_name}}"}
        </code>
        in subjects and messages. Saving updates pending follow-ups for open
        quotes.
      </p>

      <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
          <li
            key={variable.key}
            className="rounded-full border border-border px-2 py-1"
          >
            <code>{`{{${variable.key}}}`}</code>
            <span className="ml-1 text-muted-foreground/80">
              {variable.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="space-y-4 rounded-xl border border-border/80 p-4"
          >
            <p className="text-sm font-semibold">Step {index + 1}</p>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="space-y-2">
                <Label htmlFor={`day-${step.id}`}>Send on day</Label>
                <Input
                  id={`day-${step.id}`}
                  type="number"
                  min={0}
                  max={90}
                  value={step.dayOffset}
                  onChange={(event) =>
                    updateStep(index, {
                      dayOffset: Number(event.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Days after quote approval
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`subject-${step.id}`}>Email subject</Label>
                  <Input
                    id={`subject-${step.id}`}
                    value={step.subject}
                    onChange={(event) =>
                      updateStep(index, { subject: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`body-${step.id}`}>Email message</Label>
                  <Textarea
                    id={`body-${step.id}`}
                    rows={6}
                    value={step.bodyTemplate}
                    onChange={(event) =>
                      updateStep(index, { bodyTemplate: event.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save sequence"}
      </Button>
    </div>
  );
}
