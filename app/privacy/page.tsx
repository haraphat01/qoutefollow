import type { Metadata } from "next";
import Link from "next/link";

import { ContactLine, LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How QuoteFollow collects, uses and protects personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const operator = LEGAL.operator;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains how {operator} (&ldquo;we&rdquo;) handles personal information in QuoteFollow. It
        covers two groups of people: <strong>contractors</strong> who use QuoteFollow, and{" "}
        <strong>their customers</strong>, who receive quotes and emails through it.
      </p>

      <h2>1. Our role</h2>
      <p>
        For contractors&apos; own account details, we decide how the data is used. For the customer information
        contractors put into QuoteFollow, the contractor decides, and we process it on their behalf to run the
        Service. If you are a contractor&apos;s customer, contact that business first about your data; you can
        also contact us.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> name, email, hashed password, business name, phone, address, logo and settings.</li>
        <li><strong>Customer details entered by contractors:</strong> customer names, email addresses, phone numbers and notes.</li>
        <li><strong>Quotes and messages:</strong> job descriptions, prices, uploaded PDF estimates, emails sent, and customer replies.</li>
        <li>
          <strong>Acceptances:</strong> when a customer accepts a quote online, the name they type, the time, their IP
          address and browser type.
        </li>
        <li>
          <strong>Engagement:</strong> when a customer views an online quote, and (if enabled) when they open emails or
          click links in them.
        </li>
        <li><strong>Billing:</strong> handled by Stripe. We receive your plan, status and card brand and last four digits, never the full card number.</li>
        <li><strong>Technical data:</strong> server logs with IP addresses and timestamps, used for security and troubleshooting.</li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To provide the Service: send quotes and follow-ups, record acceptances, show reports.</li>
        <li>To send account emails such as verification, password resets, alerts and the weekly summary (which you can turn off).</li>
        <li>To keep the Service secure, prevent abuse, and fix problems.</li>
        <li>To bill subscriptions and meet legal obligations.</li>
      </ul>
      <p>We don&apos;t sell personal information, and we don&apos;t use customers&apos; details to market to them.</p>

      <h2>4. Service providers</h2>
      <p>We share data only with providers that help us run QuoteFollow:</p>
      <ul>
        <li><strong>Resend</strong>: sending and receiving email.</li>
        <li><strong>Stripe</strong>: subscription payments.</li>
        <li>
          <strong>OpenAI</strong>: reading imported PDF estimates and summarising customer replies. Data sent through
          OpenAI&apos;s API isn&apos;t used to train its models.
        </li>
        <li><strong>Our hosting provider</strong>: servers and database storage.</li>
      </ul>
      <p>Some of these providers process data outside your country, under their own safeguards.</p>

      <h2>5. Cookies</h2>
      <p>
        We use one essential cookie to keep you signed in. We don&apos;t use advertising or third-party tracking
        cookies.
      </p>

      <h2>6. How long we keep data</h2>
      <p>
        We keep data while a workspace is active. Contractors can delete customers and quotes at any time. When a
        workspace is closed, we delete its data within 30 days, except records we must keep by law (such as
        billing records). Unsubscribe requests are kept so we can keep honouring them.
      </p>

      <h2>7. Security</h2>
      <p>
        Passwords are stored hashed, connections are encrypted, and each workspace&apos;s data is kept separate.
        No system is perfectly secure, but we work to protect your information and will tell affected users about
        serious breaches as the law requires.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export or delete your personal
        information, or object to how it&apos;s used. Contractors can do most of this in the app (including CSV
        export). For anything else, contact us at <ContactLine />. Every email to customers includes an unsubscribe link.
      </p>

      <h2>9. Children</h2>
      <p>QuoteFollow is a business tool and isn&apos;t meant for children under 16.</p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy and will notify contractors of significant changes by email or in the app. See
        also our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>11. Contact</h2>
      <p>
        {operator}
        {LEGAL.jurisdiction ? `, ${LEGAL.jurisdiction}` : ""}. Email: <ContactLine />.
      </p>
    </LegalPage>
  );
}
