// admin/showtime/ui.tsx
//
// Shared look for the show-night phone screens (door and host console):
// near-black with cream text, deep red and gold accents, rounded
// controls sized for a thumb in a dark room.

"use client";

import type { CSSProperties, ReactNode } from "react";
import StaffHeader from "../StaffHeader";

export const CREAM = "#FBF3EC";
export const RED = "#8B1A1A";
export const SOFT_RED = "#F0A8A8";
export const GREEN = "#8FEDB0";
export const GOLD = "#D8B667";
export const MUTED = "rgba(251,243,236,0.58)";
export const PANEL_BG = "#1C1517";
export const LINE = "1px solid rgba(251,243,236,0.1)";
export const RADIUS = 12;

export const screen: CSSProperties = {
  minHeight: "100dvh",
  background: "#0E0B0C",
  color: CREAM,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif",
  display: "flex",
  flexDirection: "column",
};

export const panel: CSSProperties = {
  background: PANEL_BG,
  border: "1px solid rgba(251,243,236,0.12)",
  borderRadius: 14,
};

export const label: CSSProperties = { fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED };

export function bigButton(enabled: boolean, kind: "red" | "cream" | "ghost" | "gold" = "red"): CSSProperties {
  const base: CSSProperties = {
    width: "100%",
    minHeight: 54,
    borderRadius: RADIUS,
    border: 0,
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontFamily: "inherit",
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.35,
  };
  if (kind === "cream") return { ...base, background: CREAM, color: "#0A0A0A" };
  if (kind === "gold") return { ...base, background: GOLD, color: "#0A0A0A" };
  if (kind === "ghost") return { ...base, background: "transparent", color: CREAM, border: "1px solid rgba(251,243,236,0.3)", minHeight: 46, fontSize: 13 };
  return { ...base, background: RED, color: "#fff" };
}

export const fieldInput: CSSProperties = {
  height: 46,
  boxSizing: "border-box",
  padding: "0 12px",
  border: "1px solid rgba(251,243,236,0.22)",
  borderRadius: 10,
  background: "#17120F",
  color: CREAM,
  fontSize: 16,
  fontFamily: "inherit",
  width: "100%",
};

// Show-night screens use the shared staff header, sized for phones.
export function TopBar({ label: text, onLogout, right }: { label: string; onLogout?: () => void; right?: ReactNode }) {
  return <StaffHeader compact label={text} onLogout={onLogout} right={right} />;
}

export function Reconnecting({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div role="status" style={{ background: "rgba(240,168,168,0.12)", color: SOFT_RED, fontSize: 12, padding: "8px 20px", borderBottom: LINE }}>
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

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 6 }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            style={{
              minHeight: 38,
              padding: "0 14px",
              borderRadius: 10,
              border: `1px solid ${on ? CREAM : "rgba(251,243,236,0.16)"}`,
              background: "transparent",
              color: on ? CREAM : MUTED,
              fontSize: 11.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// When a login can see more than one of tonight's shows.
export function ShowPicker({ shows, value, onChange }: { shows: { id: string; label: string }[]; value: string | null; onChange: (id: string) => void }) {
  if (shows.length < 2) return null;
  return (
    <div style={{ padding: "10px 16px", borderBottom: LINE, display: "flex", alignItems: "center", gap: 10 }}>
      <label htmlFor="ln-show-pick" style={label}>Show</label>
      <select
        id="ln-show-pick"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...fieldInput, height: 40, fontSize: 14, appearance: "auto" }}
      >
        {shows.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

// Remembers which of tonight's shows this phone was working on.
const SHOW_KEY = "ln_staff_show";
export function savedShow(): string | null {
  try {
    return localStorage.getItem(SHOW_KEY);
  } catch {
    return null;
  }
}
export function saveShow(id: string) {
  try {
    localStorage.setItem(SHOW_KEY, id);
  } catch {
    /* private mode */
  }
}
