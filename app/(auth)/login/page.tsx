import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  return (
    <Card className="gap-0 border-[#e2e7dd] bg-white shadow-[0_24px_70px_-42px_rgba(35,75,62,0.25)]">
      <CardHeader className="gap-3 px-7 pb-5 pt-8 sm:px-9 sm:pt-10">
        <span className="grid size-11 place-items-center rounded-xl bg-[#edf4ed] text-[#477251]"><LockKeyhole className="size-5" /></span>
        <div className="space-y-2">
          <CardTitle className="text-[1.7rem] tracking-[-0.045em]">Welcome back</CardTitle>
          <CardDescription className="text-[0.9rem]">
            Sign in to pick up right where your quotes left off.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-7 pb-8 sm:px-9 sm:pb-10">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create a workspace <ArrowRight className="ml-0.5 inline size-3.5" />
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
