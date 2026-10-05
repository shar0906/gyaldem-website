// admin/showtime/ui.tsx
//
// Shared look for the show-night phone screens (door and bingo host):
// Gyal Dem black, cream, and deep red, sized for a phone held at the door.

"use client";

import type { CSSProperties, ReactNode } from "react";

export const CREAM = "#F5F0E8";
export const RED = "#8B1A1A";
export const SOFT_RED = "#E8A3A3";
export const GREEN = "#6fae6f";
export const GOLD = "#D8B667";
export const MUTED = "#A9A49C";
export const LINE = "1px solid rgba(245,240,232,0.12)";

export const screen: CSSProperties = {
  minHeight: "100dvh",
  background: "#0A0A0A",
  color: CREAM,
  fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
  display: "flex",
  flexDirection: "column",
};

export function TopBar({ label, onLogout, right }: { label: string; onLogout?: () => void; right?: ReactNode }) {
  return (
    <header style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: LINE }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: 44, objectFit: "contain" }} />
        <span style={{ fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(245,240,232,0.45)", marginTop: 4 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {right}
        {onLogout && (
          <button onClick={onLogout} style={{ background: "transparent", color: MUTED, border: "1px solid rgba(245,240,232,0.15)", padding: "8px 10px", minHeight: 36, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}>
            Log out
          </button>
        )}
      </div>
    </header>
  );
}

export function Reconnecting({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div role="status" style={{ background: "rgba(232,163,163,0.12)", color: SOFT_RED, fontSize: 12, padding: "8px 20px", borderBottom: LINE }}>
      Reconnecting… Showing the last update.
    </div>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
      {children}
    </div>
  );
}
