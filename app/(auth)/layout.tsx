import Link from "next/link";
import { ArrowLeft, Check, FileText, Mail, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f8f3] lg:grid lg:grid-cols-[minmax(350px,0.9fr)_1.1fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#234b3e] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-36 top-1/4 size-[30rem] rounded-full border border-white/[0.07]" />
        <div className="absolute -right-16 top-[30%] size-[22rem] rounded-full border border-white/[0.07]" />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-white/10"><FileText className="size-5" /></span>
            <span className="text-base font-bold tracking-tight">QuoteFollow</span>
          </Link>
        </div>
        <div className="relative z-10 max-w-lg py-14">
          <p className="mb-5 text-xs font-semibold tracking-[0.17em] text-[#b6d4b5]">YOUR WORK, FOLLOWED THROUGH</p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.06em] xl:text-6xl">
            Spend less time chasing. <span className="font-serif font-medium italic text-[#b6d4b5]">Win more work.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/70">
            A clear home for your customer quotes and the follow-ups that keep
            jobs moving.
          </p>
          <div className="mt-10 space-y-4">
            <p className="flex items-center gap-3 text-sm text-white/85"><Check className="size-4 text-[#b6d4b5]" /> Keep customer and quote details together</p>
            <p className="flex items-center gap-3 text-sm text-white/85"><Mail className="size-4 text-[#b6d4b5]" /> Follow up on a thoughtful schedule</p>
            <p className="flex items-center gap-3 text-sm text-white/85"><ShieldCheck className="size-4 text-[#b6d4b5]" /> Pause reminders when the job moves on</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/55">
          <span>Built for roofing, HVAC & plumbing</span>
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-white"><ArrowLeft className="size-3.5" /> Back home</Link>
        </div>
      </aside>
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 flex w-full max-w-[460px] items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2.5 text-[#294c3c]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#285742] text-white"><FileText className="size-[1.1rem]" /></span>
            <span className="font-bold tracking-tight">QuoteFollow</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-medium text-[#6f8074]"><ArrowLeft className="size-3.5" /> Home</Link>
        </div>
        <div className="w-full max-w-[460px]">{children}</div>
        <p className="mt-7 text-center text-xs text-[#89938b]">
          <Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/privacy" className="hover:underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
