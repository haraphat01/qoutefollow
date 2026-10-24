"use server";

import { headers } from "next/headers";

import { acceptQuote } from "@/lib/quotes/accept-quote";

export type AcceptState = { error?: string; accepted?: boolean };

/** Public: anyone with the quote link may accept it, as on paper. */
export async function acceptQuoteAction(
  publicToken: string,
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  if (formData.get("agree") !== "on") {
    return { error: "Tick the box to confirm you accept this estimate." };
  }
  const requestHeaders = await headers();
  const result = await acceptQuote({
    publicToken,
    signerName: String(formData.get("signerName") ?? ""),
    optionIndex: Number(formData.get("optionIndex") ?? 0),
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip"),
    userAgent: requestHeaders.get("user-agent"),
  });
  if (!result.ok) {
    return { error: result.reason };
  }
  // No revalidate: the form shows its own thank-you, and a reload shows "Accepted".
  return { accepted: true };
}
