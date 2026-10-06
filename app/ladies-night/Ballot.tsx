// ladies-night/Ballot.tsx
//
// People's Choice: the artist up top, then one flat list of songs. Guests
// pick up to 5 and can change them until voting closes. Vote counts are
// never shown.

"use client";

import { useState } from "react";
import { CREAM, CREAM_DIM, ErrorText, Footer, GOLD, Glow, Guest, INK, OpenCurrent, SANS, SERIF, V, card, cta, errorFor, post, prettyDateTime } from "./shared";

const MAX = 5;

export default function Ballot({
  current,
  guest,
  welcome,
  changing,
  onSubmitted,
  onNotYou,
}: {
  current: OpenCurrent;
  guest: Guest;
  welcome: boolean;
  changing: boolean;
  onSubmitted: (guest: Guest) => void;
  onNotYou: () => void;
}) {
  const [picks, setPicks] = useState<string[]>(guest.picks);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { artist, songs, show } = current;
  const atMax = picks.length >= MAX;

  const toggle = (id: string) => {
    setError(null);
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX ? [...p, id] : p));
  };

  async function submit() {
    if (!picks.length || busy) return;
    setBusy(true);
    setError(null);
    const res = await post<{ guest: Guest }>("/api/ladies-night/vote", { song_ids: picks });
    setBusy(false);
    if (res.ok) onSubmitted(res.data.guest);
    else setError(errorFor(res.data));
  }

  const label = busy ? "Saving…" : changing ? "Save my picks →" : welcome ? "Submit my picks →" : "Submit & RSVP →";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", color: CREAM, fontFamily: SANS }}>
      <main style={{ flex: 1, width: "100%", maxWidth: 440, margin: "0 auto", boxSizing: "border-box", padding: "20px 16px 8px" }}>
        {welcome && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 6px 12px" }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 20 }}>Welcome back, {guest.first_name}.</span>
            <button onClick={onNotYou} style={{ flex: "none", background: "none", border: "none", color: GOLD, fontSize: 14, padding: "12px 0", cursor: "pointer" }}>Not you?</button>
          </div>
        )}

        <section style={card} aria-label="Tonight's artist">
          <Glow />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(251,243,236,0.7)", marginBottom: 18 }}>
            <span>Ladies Night</span>
            <span style={{ color: GOLD }}>People&apos;s Choice</span>
          </div>
          {artist && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  border: `1.5px solid ${GOLD}`,
                  background: artist.photo_url ? `center / cover no-repeat url("${artist.photo_url}")` : "rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  fontSize: 22,
                  color: GOLD,
                }}
              >
                {!artist.photo_url && artist.display_name.charAt(0)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 22 }}>{artist.display_name}</span>
                {artist.instagram_handle && (
                  <a href={`https://instagram.com/${artist.instagram_handle}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: GOLD, textDecoration: "none" }}>
                    @{artist.instagram_handle}
                  </a>
                )}
              </div>
            </div>
          )}
          <h1 style={{ margin: "0 0 10px", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 32, lineHeight: 1.08 }}>
            People&apos;s Choice
            <span style={{ display: "block", color: V.accentSoft }}>vote the set list</span>
          </h1>
          {artist?.bio && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(251,243,236,0.82)" }}>{artist.bio}</p>}
          <div style={{ display: "inline-flex", marginTop: 16, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(216,182,103,0.14)", border: "1px solid rgba(216,182,103,0.45)", color: GOLD, padding: "7px 12px", borderRadius: 999 }}>
            ✦ Pick up to 5 · closes {prettyDateTime(show.voting_closes_at)}
          </div>
        </section>

        <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, color: INK, borderRadius: 14, padding: "14px 16px", margin: "18px 0 12px", fontSize: 15, boxShadow: "0 10px 22px -14px rgba(0,0,0,0.5)" }}>
          <span>
            You&apos;ve picked <b style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17 }}>{picks.length}</b> of {MAX}
          </span>
          <span style={{ background: V.accent, color: CREAM, fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 999 }}>
            {picks.length} {picks.length === 1 ? "pick" : "picks"}
          </span>
        </div>
        {atMax && <p style={{ margin: "0 0 12px", fontSize: 13, textAlign: "center", color: "rgba(251,243,236,0.78)" }}>That&apos;s all 5. Tap a pick to swap it out.</p>}

        <div role="group" aria-label="Songs">
          {songs.map((s) => {
            const on = picks.includes(s.song_id);
            return (
              <button
                key={s.song_id}
                onClick={() => toggle(s.song_id)}
                aria-pressed={on}
                aria-label={`${s.title} by ${s.artist}${on ? ", picked" : ""}`}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "left",
                  background: CREAM,
                  color: INK,
                  borderRadius: 14,
                  padding: "14px 15px",
                  marginBottom: 10,
                  border: `1.5px solid ${on ? V.accent : "transparent"}`,
                  overflow: "hidden",
                  fontFamily: SANS,
                  cursor: "pointer",
                  opacity: atMax && !on ? 0.55 : 1,
                }}
              >
                <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${V.accent}, ${GOLD})`, opacity: on ? 1 : 0 }} />
                <span aria-hidden="true" style={{ flex: "none", width: 38, height: 38, borderRadius: 999, background: on ? V.accent : CREAM_DIM, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? CREAM : "none"} stroke={on ? CREAM : "#A8767C"} strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 20s-7.5-4.6-7.5-10.1C4.5 7.2 6.6 5 9.2 5c1.3 0 2.2.6 2.8 1.5.6-.9 1.5-1.5 2.8-1.5 2.6 0 4.7 2.2 4.7 4.9C19.5 15.4 12 20 12 20z" />
                  </svg>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</span>
                  <span style={{ fontSize: 13, color: "#6B4B4F" }}>{s.artist}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Footer />
      </main>
      <div style={{ position: "sticky", bottom: 0, padding: "12px 16px calc(22px + env(safe-area-inset-bottom))", background: `linear-gradient(180deg, transparent, ${V.deep} 40%)` }}>
        <div style={{ maxWidth: 408, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {error && <ErrorText>{error}</ErrorText>}
          <button onClick={submit} disabled={!picks.length || busy} style={cta(picks.length > 0 && !busy)}>{label}</button>
        </div>
      </div>
    </div>
  );
}
