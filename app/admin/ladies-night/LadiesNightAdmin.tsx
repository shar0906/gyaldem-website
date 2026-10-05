// admin/ladies-night/LadiesNightAdmin.tsx
//
// The Ladies Night tab in the admin dashboard, with its own menu:
// Shows, Approvals, Artists, Guests, Results, Bingo deck.

"use client";

import { useState } from "react";
import ApprovalsSection from "./ApprovalsSection";
import ArtistsSection from "./ArtistsSection";
import BingoDeckSection from "./BingoDeckSection";
import GuestsSection from "./GuestsSection";
import ResultsSection from "./ResultsSection";
import ShowsSection from "./ShowsSection";
import { INK, LINE, RED } from "./kit";

const SECTIONS = ["Shows", "Approvals", "Artists", "Guests", "Results", "Bingo deck"] as const;
type Section = (typeof SECTIONS)[number];

export default function LadiesNightAdmin({ pending, onPendingChange }: { pending: number; onPendingChange: () => void }) {
  const [section, setSection] = useState<Section>("Shows");

  return (
    <div style={{ fontFamily: "sans-serif", color: INK }}>
      <nav aria-label="Ladies Night" style={{ display: "flex", gap: 26, padding: "18px 20px 0", borderBottom: LINE, overflowX: "auto" }}>
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            aria-current={section === s ? "page" : undefined}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${section === s ? RED : "transparent"}`,
              padding: "0 0 12px",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: section === s ? INK : "rgba(10,10,10,0.55)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "sans-serif",
            }}
          >
            {s}
            {s === "Approvals" && pending > 0 ? ` (${pending})` : ""}
          </button>
        ))}
      </nav>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 20px 48px" }}>
        {section === "Shows" && <ShowsSection />}
        {section === "Approvals" && <ApprovalsSection onChange={onPendingChange} />}
        {section === "Artists" && <ArtistsSection onReviewChanges={() => setSection("Approvals")} />}
        {section === "Guests" && <GuestsSection />}
        {section === "Results" && <ResultsSection />}
        {section === "Bingo deck" && <BingoDeckSection />}
      </div>
    </div>
  );
}
