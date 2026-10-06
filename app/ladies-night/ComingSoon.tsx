// ladies-night/ComingSoon.tsx
//
// Before RSVP opens: a live countdown, no form. With no show scheduled
// at all: just "coming soon."

"use client";

import { useEffect, useState } from "react";
import { CREAM, Footer, GOLD, INK, SANS, SERIF, eyebrow, prettyDateTime } from "./shared";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    ["Days", Math.floor(s / 86400)],
    ["Hours", Math.floor((s % 86400) / 3600)],
    ["Min", Math.floor((s % 3600) / 60)],
    ["Sec", s % 60],
  ] as const;
}

export default function ComingSoon({ opensAt, onOpen }: { opensAt: string | null; onOpen: () => void }) {
  const target = opensAt ? new Date(opensAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= target) {
        clearInterval(t);
        onOpen();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [target, onOpen]);

  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 440, margin: "0 auto", boxSizing: "border-box", padding: "40px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 22, color: CREAM, fontFamily: SANS, textAlign: "center" }}>
      <span style={eyebrow}>Ladies Night · An Ode To Her</span>
      <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 34, lineHeight: 1.08 }}>
        The next show
        <span style={{ display: "block", color: "var(--ln-accent-soft)" }}>is coming soon</span>
      </h1>
      {target && (
        <>
          <div role="timer" aria-label={`RSVP opens ${prettyDateTime(opensAt!)}`} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {parts(target - now).map(([label, n]) => (
              <div key={label} style={{ background: CREAM, color: INK, borderRadius: 14, padding: "14px 4px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 28 }}>{String(n).padStart(2, "0")}</span>
                <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B4B4F" }}>{label}</span>
              </div>
            ))}
          </div>
          <div>
            <span style={{ display: "inline-flex", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(216,182,103,0.14)", border: "1px solid rgba(216,182,103,0.45)", color: GOLD, padding: "7px 12px", borderRadius: 999 }}>
              ✦ RSVP opens {prettyDateTime(opensAt!)}
            </span>
          </div>
        </>
      )}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" }}>
        A new artist every show, and a set the audience picks.
      </p>
      <Footer />
    </main>
  );
}
