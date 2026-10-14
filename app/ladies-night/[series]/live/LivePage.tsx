// app/ladies-night/[series]/live/LivePage.tsx
//
// The live page's frame: the series' colors around the live view.

"use client";

import type { CSSProperties } from "react";
import LiveView from "../../LiveView";
import { CREAM, SANS } from "../../shared";
import { ballotTheme } from "../../../lib/ln/theme";

export default function LivePage({ slug, primary, accent }: { slug: string; primary: string | null; accent: string | null }) {
  const theme = ballotTheme(primary, accent);
  const vars = {
    "--ln-primary": theme.primary,
    "--ln-deep": theme.deep,
    "--ln-accent": theme.accent,
    "--ln-accent-soft": theme.accentSoft,
    minHeight: "100dvh",
    background: `radial-gradient(ellipse at top, rgba(255,255,255,0.06), transparent 60%), linear-gradient(180deg, ${theme.primary} 0%, ${theme.deep} 70%)`,
    color: CREAM,
    fontFamily: SANS,
    WebkitFontSmoothing: "antialiased",
  } as CSSProperties;
  return (
    <div style={vars}>
      <style>{`html, body { background: ${theme.deep} !important; }`}</style>
      <LiveView slug={slug} />
    </div>
  );
}
