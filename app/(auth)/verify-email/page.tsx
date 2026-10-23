import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";

import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [session, { status }] = await Promise.all([getSession(), searchParams]);
  if (session?.user.emailVerified) {
    redirect("/dashboard");
  }

  return (
    <Card className="gap-0 border-[#e2e7dd] bg-white shadow-[0_24px_70px_-42px_rgba(35,75,62,0.25)]">
      <CardHeader className="gap-3 px-7 pb-5 pt-8 sm:px-9 sm:pt-10">
        <span className="grid size-11 place-items-center rounded-xl bg-[#edf4ed] text-[#477251]"><MailCheck className="size-5" /></span>
        <div className="space-y-2">
          <CardTitle className="text-[1.7rem] tracking-[-0.045em]">Confirm your email</CardTitle>
          <CardDescription className="text-[0.9rem]">
            {session
              ? <>We sent a link to <span className="font-semibold text-foreground">{session.user.email}</span>. Click it to open your workspace.</>
              : "Click the link in your verification email, then sign in."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-7 pb-8 sm:px-9 sm:pb-10">
        {status === "invalid" ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            That link is invalid, already used, or expired. Request a new one below.
          </p>
        ) : null}
        {session ? (
          <>
            <ResendVerificationButton />
            <p className="text-center text-xs text-muted-foreground">
              Can’t find it? Check spam, or wait a minute and resend.
            </p>
            <form action="/api/auth/logout" method="post" className="text-center">
              <Button type="submit" variant="link" className="text-sm text-muted-foreground">
                Use a different account
              </Button>
            </form>
          </>
        ) : (
          <Button asChild size="lg" className="h-11 w-full rounded-xl">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
