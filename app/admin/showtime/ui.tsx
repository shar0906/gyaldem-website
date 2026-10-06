// admin/showtime/ui.tsx
//
// Shared look for the show-night phone screens (door and bingo host):
// Gyal Dem black, cream, and deep red, sized for a phone held at the door.

"use client";

import type { CSSProperties, ReactNode } from "react";
import StaffHeader from "../StaffHeader";

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

// Show-night screens use the shared staff header, sized for phones.
export function TopBar({ label, onLogout, right }: { label: string; onLogout?: () => void; right?: ReactNode }) {
  return <StaffHeader compact label={label} onLogout={onLogout} right={right} />;
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
