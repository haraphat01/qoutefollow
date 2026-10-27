import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { PublicAnalytics } from "@/components/analytics";
import { HeroDemoVideo } from "@/components/hero-demo-video";
import { Button } from "@/components/ui/button";
import { PLAN_BENEFITS, PLAN_CATALOG, TRIAL_DAYS } from "@/lib/billing/plans";
import { FAQ, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

const plan = PLAN_CATALOG.starter;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Structured data so search engines and AI assistants can describe the product accurately. */
function structuredData() {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: SITE_NAME,
        url,
        logo: `${url}/icon-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${url}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Quote follow-up and estimate tracking",
        operatingSystem: "Web browser",
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Roofing, HVAC, and plumbing contractors",
        },
        featureList: [...PLAN_BENEFITS],
        offers: {
          "@type": "Offer",
          price: plan.priceMonthly,
          priceCurrency: "USD",
          description: `${TRIAL_DAYS}-day free trial, then $${plan.priceMonthly} per month`,
          url: `${url}/register`,
        },
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f8f3] text-[#1d3029]">
      <PublicAnalytics />
      <script
        type="application/ld+json"
        // Escape "<" so the JSON can't close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c"),
        }}
      />
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <Link href="/" className="flex items-center gap-2.5" aria-label="QuoteFollow home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#234b3e] text-white">
            <FileText className="size-[1.1rem]" />
          </span>
          <span className="text-[1.05rem] font-bold tracking-tight">QuoteFollow</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden text-[#385347] sm:inline-flex">
            <Link href="#faq">FAQ</Link>
          </Button>
          <Button asChild variant="ghost" className="hidden text-[#385347] sm:inline-flex">
            <Link href="#pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" className="text-[#385347]">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="bg-[#285742] text-white hover:bg-[#1f4936]">
            <Link href="/register">
              Get started <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-10 md:px-10 md:pb-28 md:pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div className="absolute -left-44 top-8 size-[30rem] rounded-full bg-[#e9eee1] blur-3xl" />
          <div className="relative z-10">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce5d9] bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-wide text-[#456454] shadow-sm">
              <span className="size-2 rounded-full bg-[#65a378]" />
              QUOTE FOLLOW-UP SOFTWARE FOR CONTRACTORS
            </p>
            <h1 className="max-w-[650px] text-[clamp(3.15rem,7vw,5.8rem)] font-semibold leading-[0.99] tracking-[-0.075em] text-[#20372e]">
              Good work deserves a <span className="font-serif font-medium italic text-[#598264]">follow-up.</span>
            </h1>
            <p className="mt-7 max-w-[540px] text-lg leading-8 text-[#60736a]">
              Turn more roofing, HVAC, and plumbing estimates into booked jobs.
              QuoteFollow keeps every quote moving with a thoughtful follow-up
              schedule—so the next touchpoint doesn’t get lost in the day.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-xl bg-[#285742] px-5 text-sm text-white shadow-lg shadow-[#285742]/15 hover:bg-[#1f4936]">
                <Link href="/register">
                  Create your workspace <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-[#d6e0d4] bg-white/60 px-5 text-sm text-[#355745] hover:bg-white">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#687c70]">
              <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#528064]" /> Simple quote tracking</span>
              <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#528064]" /> Follow-ups on your terms</span>
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[640px] lg:ml-auto">
            <div className="absolute -right-7 -top-8 size-36 rounded-full bg-[#e5eadb] blur-2xl" />
            <HeroDemoVideo />
          </div>
        </section>

        <section className="border-y border-[#e8ebe3] bg-white/70">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[0.7fr_1.3fr] md:items-center md:px-10 md:py-16">
            <div>
              <p className="eyebrow">LESS CHASING, MORE BUILDING</p>
              <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.05em] text-[#263c31]">A small system for a big part of the job.</h2>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              <div><span className="grid size-10 place-items-center rounded-xl bg-[#eef4ec] text-[#4c7758]"><FileText className="size-5" /></span><h3 className="mt-4 text-sm font-semibold text-[#334b3d]">Every estimate in view</h3><p className="mt-2 text-sm leading-relaxed text-[#748177]">Keep customer details, quote values, and statuses organized in one workspace.</p></div>
              <div><span className="grid size-10 place-items-center rounded-xl bg-[#eef4ec] text-[#4c7758]"><Mail className="size-5" /></span><h3 className="mt-4 text-sm font-semibold text-[#334b3d]">Timely follow-through</h3><p className="mt-2 text-sm leading-relaxed text-[#748177]">Set up a practical Day 2, 5, and 9 follow-up rhythm for active quotes.</p></div>
              <div><span className="grid size-10 place-items-center rounded-xl bg-[#eef4ec] text-[#4c7758]"><ShieldCheck className="size-5" /></span><h3 className="mt-4 text-sm font-semibold text-[#334b3d]">You stay in control</h3><p className="mt-2 text-sm leading-relaxed text-[#748177]">Pause the sequence when a quote is accepted, declined, cancelled, or needs a reply.</p></div>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 border-t border-[#e8ebe3] bg-[#f8f8f3]"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-[1240px] px-5 py-16 md:px-10 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">SIMPLE MONTHLY PRICING</p>
              <h2
                id="pricing-heading"
                className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#263c31] md:text-4xl"
              >
                One plan. Everything included.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#748177] md:text-base">
                New workspaces get a {TRIAL_DAYS}-day free trial with full
                access—PDF import, follow-ups, and reporting included.
              </p>
            </div>

            <article
              className="mx-auto mt-12 flex max-w-md flex-col rounded-[1.35rem] border border-[#285742]/35 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(33,69,52,0.35)] ring-1 ring-[#285742]/10 sm:p-7"
            >
              <h3 className="text-lg font-semibold text-[#253c31]">
                {plan.name}
              </h3>
              <p className="mt-1 text-xs font-medium text-[#528064]">
                {TRIAL_DAYS}-day free trial · full access
              </p>
              <ul className="mt-5 space-y-2.5">
                {PLAN_BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2.5 text-sm text-[#4a5f54]"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[#528064]"
                      aria-hidden
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[#20372e]">
                <span className="text-4xl font-semibold tracking-tight">
                  ${plan.priceMonthly}
                </span>
                <span className="text-sm font-medium text-[#7b8a7f]">
                  /month after trial
                </span>
              </p>
              <Button
                asChild
                className="mt-6 h-11 w-full rounded-xl bg-[#285742] text-sm text-white hover:bg-[#1f4936]"
              >
                <Link href="/register">
                  Start free trial
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </article>

            <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-[#849087]">
              We&apos;re validating pricing with contractors in the field—your
              feedback helps us keep it fair as we grow.
            </p>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 border-t border-[#e8ebe3] bg-white/70"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-3xl px-5 py-16 md:px-10 md:py-20">
            <p className="eyebrow text-center">QUESTIONS CONTRACTORS ASK</p>
            <h2
              id="faq-heading"
              className="mt-3 text-center text-3xl font-semibold tracking-[-0.05em] text-[#263c31] md:text-4xl"
            >
              Frequently asked questions
            </h2>
            <div className="mt-10 divide-y divide-[#e6ebe1] rounded-2xl border border-[#e2e7dd] bg-white">
              {FAQ.map((item) => (
                <details key={item.question} className="group px-5 py-4 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#2d4537] [&::-webkit-details-marker]:hidden">
                    <h3>{item.question}</h3>
                    <span aria-hidden className="text-lg leading-none text-[#6f8a77] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[#60736a]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-7 text-xs text-[#849087] sm:flex-row sm:items-center sm:justify-between md:px-10">
        <p>QuoteFollow · Quote follow-up software for contractors. Less chasing. More booked work.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="#faq" className="hover:text-[#285742]">FAQ</Link>
          <Link href="#pricing" className="hover:text-[#285742]">Pricing</Link>
          <Link href="/login" className="hover:text-[#285742]">Sign in</Link>
          <Link href="/terms" className="hover:text-[#285742]">Terms</Link>
          <Link href="/privacy" className="hover:text-[#285742]">Privacy</Link>
        </nav>
        <Link href="/register" className="font-semibold text-[#4b6f57] hover:text-[#285742]">Build your workspace <ArrowRight className="ml-1 inline size-3.5" /></Link>
      </footer>
    </div>
  );
}
