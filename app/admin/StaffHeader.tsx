// admin/StaffHeader.tsx
//
// The one header every staff screen uses: admin, the event form, the
// artist dashboard, and the show-night phone screens (door, bingo).
// Logo, a small label under it, an optional slot on the right for
// per-screen extras, and Log out. `compact` sizes it for phones.

"use client";

import type { ReactNode } from "react";

export default function StaffHeader({
  label,
  onLogout,
  right,
  compact = false,
  showHelp = true,
}: {
  label: string;
  onLogout?: () => void;
  right?: ReactNode;
  compact?: boolean;
  showHelp?: boolean;
}) {
  return (
    <header
      style={{
        backgroundColor: "#0A0A0A",
        padding: compact ? "10px 16px" : "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: compact ? 44 : 60, objectFit: "contain" }} />
        <span
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 8,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            fontFamily: "sans-serif",
            margin: "-4px 0 0 4px",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
        {right}
        {showHelp && (
          // Opens in a new tab so the dashboard, door list, or bingo game
          // stays exactly where it was.
          <a
            href="/admin/help"
            target="_blank"
            rel="noopener"
            style={{
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 12px",
              minHeight: 36,
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Help
          </a>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              backgroundColor: "transparent",
              color: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 12px",
              minHeight: 36,
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Log out
          </button>
        )}
      </div>
    </header>
  );
}
