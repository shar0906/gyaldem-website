// ladies-night/ComingSoon.tsx
//
// Before RSVP opens: the series' title, a live countdown, no form. With
// no show scheduled at all: just "coming soon." Between shows, the last
// night's winners and photos sit underneath.

"use client";

import { useEffect, useState } from "react";
import { CREAM, Footer, GOLD, INK, LastShow, SANS, SERIF, Series, card, cta, eyebrow, prettyDate, prettyDateTime } from "./shared";
import { SeriesMark } from "./LiveView";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    ["Days", Math.floor(s / 86400)],
    ["Hours", Math.floor((s % 86400) / 3600)],
    ["Min", Math.floor((s % 3600) / 60)],
    ["Sec", s % 60],
  ] as const;
}

export default function ComingSoon({
  series,
  opensAt,
  showDate,
  last,
  onOpen,
}: {
  series: Series;
  opensAt: string | null;
  showDate: string | null;
  last: LastShow;
  onOpen: () => void;
}) {
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {series.presents_logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.presents_logo_url} alt="" style={{ height: 18, maxWidth: "80%", objectFit: "contain" }} />
        )}
        <SeriesMark series={series} size="lg" />
      </div>
      <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 30, lineHeight: 1.08 }}>
        The next one
        <span style={{ display: "block", color: "var(--ln-accent-soft)" }}>{showDate ? prettyDate(showDate) : "is coming soon"}</span>
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
      {series.tagline && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" }}>{series.tagline}</p>}
      {!series.tagline && series.features.voting && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" }}>A new artist every show, and a set the audience picks.</p>
      )}

      {last && (last.winners.length > 0 || last.gallery_url) && (
        <section style={{ ...card, display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <div style={eyebrow}>Last time · {[prettyDate(last.event_date), last.theme_name].filter(Boolean).join(" · ")}</div>
          {last.winners.map((w) => (
            <div key={w} style={{ fontSize: 15, fontWeight: 700 }}>🎉 {w}</div>
          ))}
          {last.gallery_url && (
            <a href={last.gallery_url} target="_blank" rel="noopener noreferrer" style={{ ...cta(), marginTop: 4 }}>
              See the photos →
            </a>
          )}
        </section>
      )}
      <Footer client={series.client} />
    </main>
  );
}
