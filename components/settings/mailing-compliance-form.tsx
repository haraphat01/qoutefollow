"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateMailingComplianceAction } from "@/lib/actions/deliverability";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MailingComplianceForm({
  mailingAddress,
  isOwner,
}: {
  mailingAddress: string | null;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the account owner can update CAN-SPAM mailing details.
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
          const result = await updateMailingComplianceAction({}, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          if (result.fieldErrors?.mailingAddress) {
            toast.error(result.fieldErrors.mailingAddress[0]);
            return;
          }
          toast.success("Mailing address saved.");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="mailingAddress">Postal mailing address</Label>
        <Textarea
          id="mailingAddress"
          name="mailingAddress"
          rows={3}
          required
          placeholder={`123 Main St, Suite 200\nAustin, TX 78701`}
          defaultValue={mailingAddress ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Required for CAN-SPAM compliance. Included in the footer of every
          automated follow-up.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save mailing address"}
      </Button>
    </form>
  );
}
