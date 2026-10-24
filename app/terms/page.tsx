import type { Metadata } from "next";
import Link from "next/link";

import { ContactLine, LegalPage } from "@/components/legal/legal-page";
import { PLAN_CATALOG, TRIAL_DAYS } from "@/lib/billing/plans";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using QuoteFollow, quote follow-up software for contractors.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const operator = LEGAL.operator;
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you and {operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for
        your use of QuoteFollow (the &ldquo;Service&rdquo;). By creating an account or using the Service you
        agree to them. If you use the Service for a business, you confirm you can accept these terms for it.
      </p>

      <h2>1. The Service</h2>
      <p>
        QuoteFollow helps contractors create and send estimates, collect online acceptances, send follow-up
        emails, and track results. We may improve or change features over time.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must give accurate information and keep your password secure.</li>
        <li>You are responsible for activity in your workspace, including by teammates you invite.</li>
        <li>Tell us promptly at <ContactLine /> if you think your account has been misused.</li>
      </ul>

      <h2>3. Free trial, subscription and cancellation</h2>
      <ul>
        <li>New workspaces get a {TRIAL_DAYS}-day free trial with full access. No card is needed to start.</li>
        <li>
          After the trial, the Service costs ${PLAN_CATALOG.starter.priceMonthly} per month per workspace (plus any
          applicable taxes), billed in advance through Stripe. If you upgrade during the trial, your first charge
          is on the day the trial ends.
        </li>
        <li>
          You can cancel at any time from the Billing page. You keep access until the end of the period you paid
          for. We don&apos;t refund partial months unless the law requires it.
        </li>
        <li>If a payment fails or the trial ends without a subscription, sending follow-ups and quotes is paused.</li>
        <li>We may change prices with at least 30 days&apos; notice by email.</li>
      </ul>

      <h2>4. Emailing your customers</h2>
      <p>You send emails to your customers through the Service, so you are responsible for them. You agree to:</p>
      <ul>
        <li>Only email people who asked you for an estimate or otherwise agreed to hear from you.</li>
        <li>
          Follow anti-spam and marketing laws that apply to you (such as the US CAN-SPAM Act), including
          providing your real postal address and honouring unsubscribe requests, which the Service does
          automatically.
        </li>
        <li>Not use the Service for spam, phishing, misleading content, or anything unlawful.</li>
      </ul>
      <p>We may suspend workspaces that send abusive email or harm our sending reputation.</p>

      <h2>5. Online acceptance and signatures</h2>
      <p>
        The Service lets your customers accept quotes by typing their name, and records the time, IP address and
        browser. This is provided as a convenience. Whether an acceptance creates a binding contract depends on
        your own terms and the law where you work; you are responsible for your quotes, prices and contracts
        with your customers.
      </p>

      <h2>6. Your data</h2>
      <p>
        You own the content you put into the Service, including your customers&apos; details and your quotes.
        You give us permission to store and process it only to run the Service for you. How we handle personal
        information is described in our <Link href="/privacy">Privacy Policy</Link>. You can export quotes and
        customers as CSV at any time.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Don&apos;t try to break, overload or reverse-engineer the Service, access other people&apos;s data, or
        resell it without our permission.
      </p>

      <h2>8. Availability and warranties</h2>
      <p>
        We work to keep the Service reliable, but it is provided &ldquo;as is&rdquo; without warranties of any
        kind. We don&apos;t guarantee that emails will be delivered, opened or answered, or that the Service will
        be uninterrupted or error-free.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, such as lost jobs,
        profits or data. Our total liability for any claim is limited to the amount you paid us in the 12 months
        before it.
      </p>

      <h2>10. Ending your account</h2>
      <p>
        You can stop using the Service at any time. We may suspend or close accounts that break these terms. On
        request, we delete your workspace and its data, except where we must keep records by law.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these terms. If a change is significant, we&apos;ll tell you by email or in the app before it
        takes effect. Continuing to use the Service means you accept the new terms.
      </p>

      <h2>12. Governing law and contact</h2>
      <p>
        These terms are governed by the laws of {LEGAL.jurisdiction || "the place where " + operator + " is established"}.
        Questions? Contact us at <ContactLine />.
      </p>
    </LegalPage>
  );
}
