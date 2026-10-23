"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { resendVerificationEmailAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="lg"
      className="h-11 w-full rounded-xl"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await resendVerificationEmailAction();
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Verification email sent. Check your inbox.");
        });
      }}
    >
      {pending ? "Sending…" : "Resend verification email"}
    </Button>
  );
}
