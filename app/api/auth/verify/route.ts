import { completeEmailVerification } from "@/lib/auth/account-flows";
import { consumeAuthToken, findAuthToken } from "@/lib/auth/tokens";
import { appUrl } from "@/lib/billing/stripe";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";

  const row = await findAuthToken(token, ["email_verification"]);
  if (!row || !(await consumeAuthToken(row.id))) {
    return Response.redirect(appUrl("/verify-email?status=invalid"), 303);
  }

  await completeEmailVerification(row.userId);
  return Response.redirect(appUrl("/dashboard?verified=1"), 303);
}
