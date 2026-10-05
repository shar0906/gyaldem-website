// admin/artist/ArtistDashboard.tsx
//
// What an artist sees after logging in: Propose, Profile, Results.

"use client";

import { useState } from "react";
import ArtistPropose from "./ArtistPropose";
import ArtistProfile from "./ArtistProfile";
import ArtistResults from "./ArtistResults";
import { FAINT, LINE, RED } from "./ui";

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
      <header
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "0.5px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: 60, objectFit: "contain" }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", margin: "-4px 0 0 4px" }}>
            Artist
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <span style={{ fontSize: 11, color: FAINT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
          <button
            onClick={onLogout}
            style={{ background: "transparent", color: FAINT, border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 }}
          >
            Log out
          </button>
        </div>
      </header>

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
