// ladies-night/shared.tsx
//
// Types, styles, and small pieces shared by the public /ladies-night
// screens. The look follows the People's Choice mockup: cream cards on the
// artist's deep color, Georgia italic headings, gold details.

"use client";

import type { CSSProperties, ReactNode } from "react";
import { CREAM, CREAM_DIM, GOLD, INK } from "../lib/ln/theme";

export type Artist = {
  display_name: string;
  photo_url: string | null;
  cover_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  primary_color: string | null;
  accent_color: string | null;
};
export type Vip =
  | { enabled: false }
  | { enabled: true; price_cents: number; perks: string | null; closes_at: string; closed: boolean; sold_out: boolean };
export type Song = { song_id: string; title: string; artist: string; artwork_url: string | null };
export type Current =
  | { stage: "none" }
  | { stage: "coming_soon"; rsvp_opens_at: string | null }
  | {
      stage: "rsvp_open" | "voting_open" | "voting_closed" | "coming_soon";
      door: boolean;
      show: {
        id: string;
        title: string;
        event_date: string;
        event_start_time: string;
        event_end_time: string;
        gate_headline: string | null;
        gate_description: string | null;
        voting_opens_at: string;
        voting_closes_at: string;
        opentable_url: string | null;
      };
      artist: Artist | null;
      songs: Song[];
      vip: Vip;
    };
export type OpenCurrent = Extract<Current, { show: unknown }>;
export type Guest = {
  first_name: string;
  rsvp: { share_with_artist: boolean; table_reserved: boolean; checked_in: boolean; vip_passes: number } | null;
  voted: boolean;
  picks: string[];
};
export type Prefill = { first_name: string | null; last_name: string | null; email: string } | null;

export const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
export const SERIF = "Georgia, 'Times New Roman', serif";
export { CREAM, CREAM_DIM, GOLD, INK };

// Theme colors come in as CSS variables set on the page wrapper.
export const V = {
  primary: "var(--ln-primary)",
  deep: "var(--ln-deep)",
  accent: "var(--ln-accent)",
  accentSoft: "var(--ln-accent-soft)",
};

export const eyebrow: CSSProperties = { fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(251,243,236,0.7)" };
export const h1: CSSProperties = { margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 32, lineHeight: 1.08 };
export const sub: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" };

export const cta = (enabled = true): CSSProperties => ({
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 50,
  background: `linear-gradient(180deg, ${V.accentSoft}, ${V.accent})`,
  color: CREAM,
  textAlign: "center",
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: 15,
  borderRadius: 10,
  border: "none",
  boxShadow: "0 6px 0 rgba(0,0,0,0.35)",
  fontFamily: SANS,
  cursor: enabled ? "pointer" : "default",
  opacity: enabled ? 1 : 0.45,
  textDecoration: "none",
});

export const outlineButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  minHeight: 48,
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid rgba(251,243,236,0.45)",
  background: "transparent",
  color: CREAM,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontFamily: SANS,
  cursor: "pointer",
  textDecoration: "none",
};

export const textLink: CSSProperties = {
  background: "none",
  border: "none",
  color: GOLD,
  fontSize: 14,
  padding: "12px 0",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: SANS,
};

export const card: CSSProperties = {
  position: "relative",
  background: `linear-gradient(160deg, ${V.primary} 0%, ${V.deep} 100%)`,
  borderRadius: 20,
  padding: "22px 20px",
  overflow: "hidden",
  boxShadow: "0 20px 40px -18px rgba(0,0,0,0.7)",
  border: "1px solid rgba(216,182,103,0.25)",
};

export function Glow() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", top: "-40%", right: "-30%", width: "70%", height: "140%", background: "radial-gradient(circle, rgba(255,255,255,0.07), transparent 65%)", pointerEvents: "none" }} />
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(216,182,103,0.14)", border: "1px solid rgba(216,182,103,0.45)", color: GOLD, padding: "7px 12px", borderRadius: 999 }}>
      ✦ {children}
    </span>
  );
}

export function Footer() {
  return <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(251,243,236,0.5)" }}>Gyal Dem Social Club</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ margin: 0, fontSize: 13, color: "#FFC9CF", textAlign: "center" }}>
      {children}
    </p>
  );
}

export function CalendarIcon({ color = CREAM }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function CheckIcon({ color = CREAM, size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function prettyDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function prettyDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export async function post<T>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string; message?: string; field?: string } }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, data: { error: "network" } as T & { error: string } };
  }
}

export const ERRORS: Record<string, string> = {
  network: "Couldn't connect. Check your signal and try again.",
  too_many_requests: "Too many tries. Wait a minute and try again.",
  rsvp_closed: "RSVP isn't open right now.",
  not_configured: "Something's not set up on our end. Please let a host know.",
  server_error: "Something went wrong on our end. Try again in a moment.",
  voting_closed: "Voting has closed.",
  invalid_pick_count: "Pick between 1 and 5 songs.",
  invalid_songs: "The song list changed. Refresh and pick again.",
  consent_required: "Tap Let me in to agree and continue.",
};

export function errorFor(data: { error?: string; message?: string }): string {
  return data.message ?? ERRORS[data.error ?? ""] ?? ERRORS.server_error;
}
