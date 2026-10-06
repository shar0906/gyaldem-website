// ladies-night/CheckedIn.tsx
//
// Show night, after the door QR: "You're checked in," voting status, and
// a short intro to the series for first-timers.

"use client";

import { CheckIcon, CREAM, Footer, GOLD, Glow, Guest, INK, OpenCurrent, SANS, SERIF, V, card, eyebrow, h1 } from "./shared";

export default function CheckedIn({ current, guest }: { current: OpenCurrent; guest: Guest }) {
  const { artist, show, stage } = current;
  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 440, margin: "0 auto", boxSizing: "border-box", padding: "36px 16px calc(26px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 18, color: CREAM, fontFamily: SANS }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 6px" }}>
        <span style={eyebrow}>{show.title}</span>
        <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 999, border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckIcon color={GOLD} size={22} />
        </div>
        <h1 style={h1}>
          You&apos;re checked in, {guest.first_name}.
          <span style={{ display: "block", color: V.accentSoft }}>Enjoy the night.</span>
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, color: INK, borderRadius: 14, padding: "14px 16px", fontSize: 15 }}>
        <b style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17 }}>People&apos;s Choice</b>
        <span style={{ background: V.accent, color: CREAM, fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 999 }}>
          {stage === "voting_open" ? "Voting open" : "Voting closed"}
        </span>
      </div>
      <p style={{ margin: 0, padding: "0 6px", fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" }}>
        {stage === "voting_open"
          ? "Voting is still open, so there's time to pick your songs."
          : `Tonight's set was picked by the guests who voted.${artist ? ` ${artist.display_name} takes the stage tonight.` : ""}`}
      </p>

      <section style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
        <Glow />
        <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD }}>About the series</span>
        <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 22, lineHeight: 1.15 }}>A new artist every show, and a set the audience picks.</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" }}>
          Ladies Night is a recurring night of live music at Brooklyn Chop House. You&apos;re on the list, so you&apos;ll hear about the next one first.
        </p>
      </section>
      <div style={{ flex: 1 }} />
      <Footer />
    </main>
  );
}
