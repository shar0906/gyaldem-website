// admin/artist/ui.ts
//
// Shared styles for the artist dashboard: Gyal Dem black, cream, and red,
// matching the admin portal. Artist colors only appear in the previews.

import type { CSSProperties } from "react";

export const RED = "#8B1A1A";
export const SOFT_RED = "#E8A3A3";
export const GREEN = "#6fae6f";
export const GOLD = "#D8B667";
export const MUTED = "rgba(255,255,255,0.55)";
export const FAINT = "rgba(255,255,255,0.4)";
export const LINE = "0.5px solid rgba(255,255,255,0.08)";

export const label: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: FAINT,
  fontFamily: "sans-serif",
  marginBottom: 6,
  display: "block",
};

export const input: CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "white",
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const primaryButton = (enabled = true): CSSProperties => ({
  backgroundColor: enabled ? RED : "rgba(255,255,255,0.1)",
  color: enabled ? "white" : FAINT,
  border: "none",
  padding: "13px 20px",
  fontSize: 11,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontFamily: "sans-serif",
  cursor: enabled ? "pointer" : "default",
});

export const textButton: CSSProperties = {
  background: "none",
  border: "none",
  color: SOFT_RED,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  padding: "8px 0",
  fontFamily: "sans-serif",
};

export const heading: CSSProperties = {
  fontFamily: "Georgia, serif",
  fontStyle: "italic",
  fontWeight: 400,
  fontSize: 28,
  margin: "0 0 6px",
};

export function formatShowDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
