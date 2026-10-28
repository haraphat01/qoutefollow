import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { TRAKS_QUEUE_SNIPPET, TRAKS_SITE_ID, TRAKS_SRC } from "@/lib/analytics";
import { Toaster } from "@/components/ui/sonner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "quote follow-up software",
    "estimate follow-up",
    "contractor follow-up emails",
    "roofing estimate follow-up",
    "HVAC quote follow-up",
    "plumbing estimate follow-up",
    "contractor CRM",
    "automated follow-up emails",
  ],
  category: "business",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0c281c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors closeButton />
        <Script id="traks-stub" strategy="beforeInteractive">{TRAKS_QUEUE_SNIPPET}</Script>
        <Script defer data-site={TRAKS_SITE_ID} src={TRAKS_SRC} strategy="afterInteractive" />
      </body>
    </html>
  );
}
