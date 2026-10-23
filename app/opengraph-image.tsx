import { ImageResponse } from "next/og";

import { PLAN_CATALOG, TRIAL_DAYS } from "@/lib/billing/plans";

export const alt =
  "QuoteFollow — automatic follow-ups for roofing, HVAC, and plumbing estimates";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0c281c",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#80cd82" />
            <g
              transform="translate(11 11) scale(1.75)"
              fill="none"
              stroke="#072318"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </g>
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700 }}>QuoteFollow</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Good work deserves a follow-up.
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>
            Automatic, polite follow-ups on roofing, HVAC, and plumbing estimates — paused the moment a customer replies.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#80cd82", fontWeight: 600 }}>
          {`${TRIAL_DAYS}-day free trial · $${PLAN_CATALOG.starter.priceMonthly}/month for your whole team`}
        </div>
      </div>
    ),
    size,
  );
}
