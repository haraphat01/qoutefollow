import { Check, Circle } from "lucide-react";

import { parseEmailFromAddress } from "@/lib/email/sending-domain";

function Item({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex gap-3 text-sm">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
          done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="size-3" /> : <Circle className="size-3" />}
      </span>
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

export function DeliverabilityChecklist({
  emailFrom,
  hasResendKey,
  hasWebhookSecret,
  mailingAddress,
}: {
  emailFrom: string | undefined;
  hasResendKey: boolean;
  hasWebhookSecret: boolean;
  mailingAddress: string | null;
}) {
  const parsed = parseEmailFromAddress(emailFrom);
  const publicProvider =
    parsed?.domain &&
    ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(
      parsed.domain,
    );

  return (
    <ul className="space-y-4">
      <Item
        done={hasResendKey}
        label="Resend API key"
        detail="Set RESEND_API_KEY in Coolify so the worker can send mail."
      />
      <Item
        done={Boolean(parsed?.domain) && !publicProvider}
        label="Branded sending domain"
        detail={
          publicProvider
            ? "EMAIL_FROM uses a consumer mailbox — verify a custom domain in Resend instead."
            : parsed
              ? `Sending from ${parsed.address} (${parsed.domain}). Confirm the domain shows Verified in Resend.`
              : "Set EMAIL_FROM to an address on your verified domain."
        }
      />
      <Item
        done={hasWebhookSecret}
        label="Bounce & complaint webhooks"
        detail="RESEND_WEBHOOK_SECRET enables automatic suppressions when mail fails."
      />
      <Item
        done={Boolean(mailingAddress?.trim())}
        label="CAN-SPAM mailing address"
        detail="Physical business address appears in the footer of follow-up emails."
      />
    </ul>
  );
}
