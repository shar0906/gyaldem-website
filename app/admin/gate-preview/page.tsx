// app/admin/gate-preview/page.tsx
//
// The real sign-in page, drawn inside the phone frame on the admin Shows
// screen. The Shows editor posts its unsaved values here (same origin
// only) and this renders the guest Gate with them, so the preview is the
// page guests get, not a copy. Submitting does nothing.

"use client";

import { CSSProperties, useEffect, useState } from "react";
import Gate from "../../ladies-night/Gate";
import { CREAM, OpenCurrent, SANS } from "../../ladies-night/shared";
import { ballotTheme } from "../../lib/ln/theme";

type Message = { type: "ln-gate-preview"; current: OpenCurrent };

export default function GatePreviewPage() {
  const [current, setCurrent] = useState<OpenCurrent | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as Message | null;
      if (data?.type === "ln-gate-preview" && data.current) setCurrent(data.current);
    };
    window.addEventListener("message", onMessage);
    // Tell the editor we're ready for the first set of values.
    window.parent?.postMessage({ type: "ln-gate-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!current) return <div style={{ minHeight: "100dvh", background: "#2B2224" }} />;

  const theme =
    current.series.features.voting && current.artist
      ? ballotTheme(current.artist.primary_color, current.artist.accent_color)
      : ballotTheme(current.series.primary_color, current.series.accent_color);
  const vars = {
    "--ln-primary": theme.primary,
    "--ln-deep": theme.deep,
    "--ln-accent": theme.accent,
    "--ln-accent-soft": theme.accentSoft,
    minHeight: "100dvh",
    background: theme.deep,
    color: CREAM,
    fontFamily: SANS,
    WebkitFontSmoothing: "antialiased",
  } as CSSProperties;

  return (
    <div style={vars}>
      <style>{`html, body { background: ${theme.deep} !important; margin: 0; } .ln-root input::placeholder { color: rgba(251,243,236,0.4); }`}</style>
      <div className="ln-root">
        <Gate current={current} prefill={null} doorCode={null} onEntered={() => {}} preview />
      </div>
    </div>
  );
}
