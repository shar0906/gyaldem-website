// admin/ladies-night/kit.tsx
//
// Shared styles and small building blocks for the admin Ladies Night
// section. Matches the existing admin portal: cream page, white panels,
// black and deep red, Georgia italic headings, square corners.

"use client";

import type { CSSProperties, ReactNode } from "react";

export const INK = "#0A0A0A";
export const RED = "#8B1A1A";
export const GREEN = "#2d6a2d";
export const MUTED = "rgba(10,10,10,0.55)";
export const FAINT = "rgba(10,10,10,0.4)";
export const LINE = "0.5px solid rgba(10,10,10,0.12)";
export const PANEL: CSSProperties = { background: "#ffffff", border: "0.5px solid rgba(10,10,10,0.15)" };

export const labelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(10,10,10,0.6)",
  display: "block",
  marginBottom: 6,
  fontFamily: "sans-serif",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 40,
  border: "0.5px solid rgba(10,10,10,0.3)",
  background: "#ffffff",
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  color: INK,
};

export const sectionLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: RED,
  margin: 0,
};

export function button(kind: "primary" | "secondary" | "quiet" = "primary", enabled = true): CSSProperties {
  const base: CSSProperties = {
    padding: "11px 16px",
    fontSize: 10,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    fontFamily: "sans-serif",
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.45,
    textDecoration: "none",
    display: "inline-block",
    lineHeight: 1.4,
  };
  if (kind === "primary") return { ...base, background: RED, color: "#ffffff", border: "none" };
  if (kind === "secondary") return { ...base, background: "transparent", color: RED, border: `1px solid ${RED}` };
  return { ...base, background: "transparent", color: MUTED, border: "none", padding: "11px 8px" };
}

export function H1({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 32, color: INK }}>{children}</h1>
      {action}
    </div>
  );
}

export function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{hint}</span>}
    </div>
  );
}

export function Stat({ name, value, note }: { name: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div style={{ ...PANEL, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED }}>{name}</span>
      <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 28, color: INK }}>{value}</span>
      {note && <span style={{ fontSize: 12, color: MUTED }}>{note}</span>}
    </div>
  );
}

const STAGE: Record<string, { text: string; color: string }> = {
  coming_soon: { text: "Coming soon", color: "rgba(10,10,10,0.55)" },
  rsvp_open: { text: "RSVP open", color: GREEN },
  voting_open: { text: "Voting open", color: GREEN },
  voting_closed: { text: "Voting closed", color: RED },
  past: { text: "Past", color: "rgba(10,10,10,0.45)" },
  archived: { text: "Archived", color: "rgba(10,10,10,0.45)" },
};

export function StageChip({ stage }: { stage: string }) {
  const s = STAGE[stage] ?? { text: stage, color: MUTED };
  return (
    <span style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: s.color, border: `0.5px solid ${s.color}`, padding: "3px 8px", whiteSpace: "nowrap" }}>
      {s.text}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
  const color = tone === "ok" ? GREEN : tone === "error" ? RED : MUTED;
  return (
    <p role={tone === "error" ? "alert" : "status"} style={{ fontSize: 13, color, margin: "8px 0 0" }}>
      {children}
    </p>
  );
}

export async function api<T = Record<string, unknown>>(
  url: string,
  init?: { method?: string; body?: unknown }
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "network" } as T };
  }
}

export function showLabel(s: { event_date: string; artist?: { display_name: string } | null }): string {
  const date = new Date(`${s.event_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${date} · ${s.artist?.display_name ?? "No artist yet"}`;
}

export const ERROR_TEXT: Record<string, string> = {
  network: "Couldn't reach the server. Check your connection and try again.",
  server_error: "Something went wrong on the server. Try again in a moment.",
  unauthorized: "Your login expired. Refresh the page and sign in again.",
  not_found: "That item doesn't exist anymore. Refresh the page.",
};

export function errorText(data: { error?: string; message?: string }, fallback = "Something went wrong. Try again."): string {
  return data.message ?? (data.error ? ERROR_TEXT[data.error] : undefined) ?? fallback;
}
