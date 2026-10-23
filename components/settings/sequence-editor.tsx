"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updateDefaultSequenceAction } from "@/lib/actions/sequences";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/email/template-variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_STEPS = 10;

export type SequenceStepInput = {
  id: string;
  dayOffset: number;
  subject: string;
  bodyTemplate: string;
  sortOrder: number;
};

type EditableStep = Omit<SequenceStepInput, "id" | "sortOrder"> & {
  /** Undefined for steps added in this editor session. */
  id?: string;
  key: string;
};

export function SequenceEditor({
  sequenceId,
  name: initialName,
  steps: initialSteps,
}: {
  sequenceId: string;
  name: string;
  steps: SequenceStepInput[];
}) {
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    initialSteps.map((step) => ({
      id: step.id,
      key: step.id,
      dayOffset: step.dayOffset,
      subject: step.subject,
      bodyTemplate: step.bodyTemplate,
    })),
  );
  const [pending, startTransition] = useTransition();

  function updateStep(
    index: number,
    patch: Partial<Pick<EditableStep, "dayOffset" | "subject" | "bodyTemplate">>,
  ) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  function addStep() {
    setSteps((current) => {
      const lastDay = current.at(-1)?.dayOffset ?? 0;
      return [
        ...current,
        {
          key: `new-${Date.now()}`,
          dayOffset: Math.min(90, lastDay + 3),
          subject: "Checking in on estimate {{quote_number}}",
          bodyTemplate:
            "Hi {{customer_name}},\n\nJust checking in on your {{job_description}} estimate ({{quote_number}}). Let me know if you have any questions.",
        },
      ];
    });
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index));
  }

  function save() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sequenceId", sequenceId);
      formData.set("name", name);
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
        const first = Object.values(result.fieldErrors).flat()[0];
        toast.error(first ?? "Check the highlighted fields and try again.");
        return;
      }
      toast.success("Follow-up sequence saved. Open quotes were rescheduled.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="max-w-md space-y-2">
        <Label htmlFor={`sequence-name-${sequenceId}`}>Sequence name</Label>
        <Input
          id={`sequence-name-${sequenceId}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Use merge tags like{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          {"{{customer_name}}"}
        </code>
        in subjects and messages. Saving updates pending follow-ups for open
        quotes. Steps send in day order.
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
            key={step.key}
            className="space-y-4 rounded-xl border border-border/80 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Step {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                disabled={pending || steps.length <= 1}
                onClick={() => removeStep(index)}
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="space-y-2">
                <Label htmlFor={`day-${step.key}`}>Send on day</Label>
                <Input
                  id={`day-${step.key}`}
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
                  <Label htmlFor={`subject-${step.key}`}>Email subject</Label>
                  <Input
                    id={`subject-${step.key}`}
                    value={step.subject}
                    onChange={(event) =>
                      updateStep(index, { subject: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`body-${step.key}`}>Email message</Label>
                  <Textarea
                    id={`body-${step.key}`}
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          disabled={pending || steps.length >= MAX_STEPS}
          onClick={addStep}
        >
          <Plus className="size-4" /> Add step
        </Button>
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save sequence"}
        </Button>
      </div>
    </div>
  );
}
