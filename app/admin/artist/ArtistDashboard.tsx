// admin/artist/ArtistDashboard.tsx
//
// What an artist sees after logging in: Propose, Profile, Results.

"use client";

import { useState } from "react";
import ArtistPropose from "./ArtistPropose";
import ArtistProfile from "./ArtistProfile";
import ArtistResults from "./ArtistResults";
import { FAINT, LINE, RED } from "./ui";
import StaffHeader from "../StaffHeader";

const TABS = [
  { id: "propose", label: "Propose" },
  { id: "profile", label: "Profile" },
  { id: "results", label: "Results" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function ArtistDashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [tab, setTab] = useState<TabId>("propose");

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "white", fontFamily: "sans-serif" }}>
      <StaffHeader
        label="Artist"
        onLogout={onLogout}
        right={<span style={{ fontSize: 11, color: FAINT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>}
      />

      <nav role="tablist" aria-label="Artist sections" style={{ display: "flex", gap: 28, padding: "16px 20px 0", borderBottom: LINE, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${tab === t.id ? RED : "transparent"}`,
              color: tab === t.id ? "white" : "rgba(255,255,255,0.55)",
              padding: "0 0 12px",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "propose" && <ArtistPropose />}
      {tab === "profile" && <ArtistProfile />}
      {tab === "results" && <ArtistResults />}
    </div>
  );
}
