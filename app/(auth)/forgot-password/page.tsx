import Link from "next/link";
import { KeyRound } from "lucide-react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card className="gap-0 border-[#e2e7dd] bg-white shadow-[0_24px_70px_-42px_rgba(35,75,62,0.25)]">
      <CardHeader className="gap-3 px-7 pb-5 pt-8 sm:px-9 sm:pt-10">
        <span className="grid size-11 place-items-center rounded-xl bg-[#edf4ed] text-[#477251]"><KeyRound className="size-5" /></span>
        <div className="space-y-2">
          <CardTitle className="text-[1.7rem] tracking-[-0.045em]">Reset your password</CardTitle>
          <CardDescription className="text-[0.9rem]">
            Enter your account email and we’ll send you a link to choose a new password.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-7 pb-8 sm:px-9 sm:pb-10">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
