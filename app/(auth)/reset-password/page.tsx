import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { KeyRound } from "lucide-react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Card className="gap-0 border-[#e2e7dd] bg-white shadow-[0_24px_70px_-42px_rgba(35,75,62,0.25)]">
      <CardHeader className="gap-3 px-7 pb-5 pt-8 sm:px-9 sm:pt-10">
        <span className="grid size-11 place-items-center rounded-xl bg-[#edf4ed] text-[#477251]"><KeyRound className="size-5" /></span>
        <div className="space-y-2">
          <CardTitle className="text-[1.7rem] tracking-[-0.045em]">Set your password</CardTitle>
          <CardDescription className="text-[0.9rem]">
            Choose a password for your QuoteFollow account. You’ll be signed in right after.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-7 pb-8 sm:px-9 sm:pb-10">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          Link expired?{" "}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Request a new one</Link>
        </p>
      </CardContent>
    </Card>
  );
}
