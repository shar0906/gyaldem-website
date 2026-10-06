// ladies-night/Gate.tsx
//
// The way in: the artist's cover photo under a neutral dark tint, the
// show's headline and description, and the RSVP form. Pressing the
// button is the consent (the line sits right under it). "Already
// RSVP'd?" switches to an email-only lookup. Through the door QR on
// show night, the same form also checks the guest in.

"use client";

import { useState } from "react";
import { CREAM, ErrorText, GOLD, Guest, OpenCurrent, Prefill, SANS, SERIF, cta, errorFor, post, textLink } from "./shared";

const field = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "rgba(251,243,236,0.08)",
  border: "1px solid rgba(251,243,236,0.24)",
  color: CREAM,
  borderRadius: 9,
  padding: "12px 13px",
  fontSize: 16,
  fontFamily: SANS,
};
const fieldLabel = { display: "block", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(251,243,236,0.7)", marginBottom: 7 };

export default function Gate({
  current,
  prefill,
  doorCode,
  onEntered,
}: {
  current: OpenCurrent;
  prefill: Prefill;
  doorCode: string | null;
  onEntered: (guest: Guest) => void;
}) {
  const [mode, setMode] = useState<"new" | "returning">("new");
  const [first, setFirst] = useState(prefill?.first_name ?? "");
  const [last, setLast] = useState(prefill?.last_name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { show, artist, door } = current;
  const headline = show.gate_headline || show.title;
  const ready = mode === "returning" ? email.trim().length > 3 : first.trim() && last.trim() && email.trim().length > 3;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const res =
      mode === "returning"
        ? await post<{ guest: Guest }>("/api/ladies-night/returning", { email, door: doorCode ?? undefined })
        : await post<{ guest: Guest }>("/api/ladies-night/gate", {
            first_name: first,
            last_name: last,
            email,
            consent: true,
            share_with_artist: share,
            door: doorCode ?? undefined,
          });
    setBusy(false);
    if (res.ok) return onEntered(res.data.guest);
    if (mode === "returning" && res.data.error === "not_found") {
      setMode("new");
      setNotFound(true);
      return;
    }
    setError({ field: res.data.field, text: errorFor(res.data) });
  }

  const inputProps = { onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && submit() };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "#2B2224", color: CREAM, fontFamily: SANS, overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          height: "62%",
          background: artist?.cover_url ? `center top / cover no-repeat url("${artist.cover_url}")` : "linear-gradient(180deg, #4A3A3D, #2B2224)",
        }}
      />
      <div
        style={{
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          boxSizing: "border-box",
          padding: "40vh 22px calc(26px + env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, rgba(18,13,14,0) 0%, rgba(18,13,14,0.55) 32%, #120D0E 58%, #120D0E 100%)",
        }}
      >
        <main style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", textAlign: "center" }}>
          {door && (
            <span style={{ alignSelf: "center", marginBottom: 12, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD, border: `1px solid ${GOLD}66`, borderRadius: 999, padding: "6px 12px" }}>
              You&apos;re at the door
            </span>
          )}
          <h1 style={{ margin: "0 0 10px", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>
            {mode === "returning" ? "Welcome back" : headline}
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.55, color: "rgba(251,243,236,0.78)" }}>
            {mode === "returning"
              ? "Enter the email you RSVP'd with and we'll pull you right up."
              : notFound
                ? "We couldn't find that email for this show. Add your name to RSVP."
                : show.gate_description}
          </p>

          {mode === "new" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, textAlign: "left" }}>
              <div>
                <label htmlFor="ln-first" style={fieldLabel}>First name</label>
                <input id="ln-first" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" maxLength={60} aria-invalid={error?.field === "first_name"} style={field} {...inputProps} />
              </div>
              <div>
                <label htmlFor="ln-last" style={fieldLabel}>Last name</label>
                <input id="ln-last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" maxLength={60} aria-invalid={error?.field === "last_name"} style={field} {...inputProps} />
              </div>
            </div>
          )}
          <div style={{ textAlign: "left" }}>
            <label htmlFor="ln-email" style={fieldLabel}>Your email</label>
            <input id="ln-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@email.com" aria-invalid={error?.field === "email"} style={field} {...inputProps} />
          </div>

          {mode === "new" && artist && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, textAlign: "left", fontSize: 13, lineHeight: 1.4, color: "rgba(251,243,236,0.85)", cursor: "pointer" }}>
              <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} style={{ width: 20, height: 20, margin: 0, flex: "none", accentColor: "var(--ln-accent)" }} />
              <span>
                Share my name and email with {artist.display_name} <span style={{ color: "rgba(251,243,236,0.6)" }}>(optional)</span>
              </span>
            </label>
          )}

          <button onClick={submit} disabled={!ready || busy} style={{ ...cta(!!ready && !busy), marginTop: 18 }}>
            {busy ? "One moment…" : door ? "Check me in →" : "Let me in →"}
          </button>
          {error && <div style={{ marginTop: 10 }}><ErrorText>{error.text}</ErrorText></div>}

          <button
            onClick={() => {
              setMode(mode === "new" ? "returning" : "new");
              setError(null);
              setNotFound(false);
            }}
            style={{ ...textLink, marginTop: 8 }}
          >
            {mode === "new" ? "Already RSVP'd?" : "New here? Enter your details"}
          </button>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, lineHeight: 1.5, color: "rgba(251,243,236,0.65)" }}>
            By continuing, you&apos;re RSVPing for this event and joining the Gyal Dem mailing list.
          </p>
        </main>
      </div>
    </div>
  );
}
