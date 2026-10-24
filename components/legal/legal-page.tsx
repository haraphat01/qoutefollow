import Link from "next/link";
import { FileText } from "lucide-react";

import { LEGAL } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f8f3] text-[#1d3029]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="QuoteFollow home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#234b3e] text-white">
            <FileText className="size-[1.1rem]" />
          </span>
          <span className="text-[1.05rem] font-bold tracking-tight">QuoteFollow</span>
        </Link>
        <nav className="flex gap-4 text-sm text-[#4b6f57]">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[#6d7f73]">Last updated {LEGAL.lastUpdated}</p>
        <div className="legal-prose mt-8 space-y-5 text-[0.95rem] leading-7 [&_a]:font-medium [&_a]:text-[#285742] [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export function ContactLine() {
  return LEGAL.contactEmail ? (
    <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
  ) : (
    <span>the contact details on our website</span>
  );
}
