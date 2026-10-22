"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateOrganizationEmailSettingsAction } from "@/lib/actions/sequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EmailSettingsForm({
  businessPhone,
  emailSignature,
  replyEmail,
}: {
  businessPhone: string | null;
  emailSignature: string | null;
  replyEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateOrganizationEmailSettingsAction(
            {},
            formData,
          );
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Email settings saved.");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="replyEmailDisplay">Reply-to email</Label>
        <Input
          id="replyEmailDisplay"
          value={replyEmail ?? ""}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Set from your account email at registration. Contact support to change.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessPhone">Business phone</Label>
        <Input
          id="businessPhone"
          name="businessPhone"
          placeholder="(512) 555-0100"
          defaultValue={businessPhone ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Available as {"{{business_phone}}"} in follow-up templates.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailSignature">Email signature</Label>
        <Textarea
          id="emailSignature"
          name="emailSignature"
          rows={4}
          placeholder="Mike Rivera\nOwner, Summit Roofing"
          defaultValue={emailSignature ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Appended above your business name on every automated follow-up.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save email settings"}
      </Button>
    </form>
  );
}
