// ladies-night/Gate.tsx
//
// The way in, shared by every series: a full-bleed photo (the show's own
// cover, else the artist's on voting series, else the series'), the event logos at
// the top, the night in a line or two of clean text, and the RSVP form,
// with the brand logos underneath. Built to fit one phone screen.
// Pressing the button is the consent (the line sits right under it).
// "Already RSVP'd?" switches to an email-only lookup. Through the door QR
// on show night, the same form also checks the guest in.

"use client";

import { useState } from "react";
import { CREAM, ErrorText, Footer, GOLD, Guest, OpenCurrent, Prefill, SANS, SERIF, cta, errorFor, post, prettyTime, textLink } from "./shared";

const field = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "rgba(251,243,236,0.1)",
  border: "1px solid rgba(251,243,236,0.26)",
  color: CREAM,
  borderRadius: 9,
  padding: "11px 12px",
  fontSize: 16,
  fontFamily: SANS,
};
const fieldLabel = { display: "block", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(251,243,236,0.72)", marginBottom: 6 };

function shortDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function Gate({
  current,
  prefill,
  doorCode,
  onEntered,
  preview = false,
}: {
  current: OpenCurrent;
  prefill: Prefill;
  doorCode: string | null;
  onEntered: (guest: Guest) => void;
  // Admin's phone preview: looks the same, sends nothing.
  preview?: boolean;
}) {
  const [mode, setMode] = useState<"new" | "returning">("new");
  const [first, setFirst] = useState(prefill?.first_name ?? "");
  const [last, setLast] = useState(prefill?.last_name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { show, artist, door, series, venue } = current;
  const voting = series.features.voting;
  const client = series.client;
  const ready = mode === "returning" ? email.trim().length > 3 : first.trim() && last.trim() && email.trim().length > 3;

  async function submit() {
    if (!ready || busy || preview) return;
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

  // This show's own cover first, then the artist's (People's Choice), then the series'.
  const cover = show.cover_url || (voting && artist?.cover_url) || series.cover_url;
  const coverStyle = cover ? { backgroundImage: `url("${cover}")` } : { backgroundImage: "linear-gradient(180deg, #4A3A3D, #2B2224)" };

  // Without a title logo, the show's headline is the title.
  const textTitle = show.gate_headline || (voting ? show.title : series.name);
  const blurb = show.gate_description || series.tagline;
  const details = [shortDate(show.event_date), prettyTime(show.event_start_time.slice(0, 5)), venue?.name].filter(Boolean).join(" · ");
  const consent = client
    ? `By continuing, you're RSVPing, joining the Gyal Dem mailing list, and sharing your RSVP with ${client.name}.`
    : "By continuing, you're RSVPing for this event and joining the Gyal Dem mailing list.";

  return (
    <div className="ln-gate" style={{ color: CREAM, fontFamily: SANS }}>
      <style>{`
        /* Full-bleed photo; the top darkens a little behind the logos, the
           bottom fades into the deep color behind the form. */
        .ln-gate { position: relative; min-height: 100dvh; background: var(--ln-deep); display: flex; justify-content: center; overflow: hidden; }
        .ln-gate-backdrop { display: none; }
        .ln-gate-frame { position: relative; width: 100%; min-height: 100dvh; overflow: hidden; }
        .ln-gate-photo { position: absolute; inset: 0; background-color: #2B2224; background-size: cover; background-position: center 20%; background-repeat: no-repeat; }
        .ln-gate-shade { position: absolute; inset: 0; background: linear-gradient(180deg,
            rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.05) 26%, rgba(0,0,0,0) 38%,
            color-mix(in srgb, var(--ln-deep) 70%, transparent) 58%,
            var(--ln-deep) 76%, var(--ln-deep) 100%); }
        .ln-gate-body { position: relative; min-height: 100dvh; box-sizing: border-box; display: flex; flex-direction: column; align-items: center;
          padding: calc(18px + env(safe-area-inset-top)) 20px calc(14px + env(safe-area-inset-bottom)); }
        .ln-gate-title img { filter: drop-shadow(0 2px 14px rgba(0,0,0,0.45)); }
        .ln-gate h1 { text-wrap: balance; }
        .ln-gate-title-logo { height: clamp(78px, 17vh, 150px); }
        @media (max-height: 700px) { .ln-gate-title-logo { height: clamp(64px, 13vh, 96px); } .ln-gate-blurb { display: none; } }
        @media (min-width: 700px) {
          .ln-gate-backdrop { display: block; position: absolute; inset: -40px; background-size: cover; background-position: center; filter: blur(28px) brightness(0.4) saturate(1.1); }
          .ln-gate-frame { max-width: 480px; box-shadow: 0 0 80px rgba(0,0,0,0.55); }
        }
      `}</style>
      <div aria-hidden="true" className="ln-gate-backdrop" style={coverStyle} />
      <div className="ln-gate-frame">
        <div aria-hidden="true" className="ln-gate-photo" style={coverStyle} />
        <div aria-hidden="true" className="ln-gate-shade" />
        <div className="ln-gate-body">
          <header className="ln-gate-title" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", width: "100%", maxWidth: 420 }}>
            {series.presents_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={series.presents_logo_url} alt={client ? `${client.name} presents` : ""} style={{ height: 20, maxWidth: "80%", objectFit: "contain" }} />
            )}
            {series.title_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ln-gate-title-logo" src={series.title_logo_url} alt={series.name} style={{ maxWidth: "88%", objectFit: "contain" }} />
            ) : (
              <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 32, lineHeight: 1.06, textShadow: "0 2px 18px rgba(0,0,0,0.5)" }}>
                {textTitle}
              </h1>
            )}
            {voting && artist && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}>with</span>
                {artist.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.logo_url} alt={artist.display_name} style={{ height: 34, maxWidth: 180, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 20, textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}>{artist.display_name}</span>
                )}
              </div>
            )}
          </header>

          <div style={{ flex: 1, minHeight: 24 }} />

          <main style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", textAlign: "center" }}>
            {(door || show.theme_name) && (
              <span style={{ alignSelf: "center", marginBottom: 10, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD, border: `1px solid ${GOLD}66`, borderRadius: 999, padding: "6px 12px", background: "rgba(0,0,0,0.18)" }}>
                {door ? "You're at the door" : `✦ ${show.theme_name}`}
              </span>
            )}
            {mode === "returning" ? (
              <>
                <h2 style={{ margin: "0 0 6px", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 24 }}>Welcome back</h2>
                <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "rgba(251,243,236,0.82)" }}>Enter the email you RSVP&apos;d with and we&apos;ll pull you right up.</p>
              </>
            ) : (
              <>
                {notFound ? (
                  <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: "rgba(251,243,236,0.85)" }}>We couldn&apos;t find that email for this night. Add your name to RSVP.</p>
                ) : (
                  blurb && (
                    <p className="ln-gate-blurb" style={{ margin: "0 0 8px", fontFamily: SERIF, fontStyle: "italic", fontSize: 18, lineHeight: 1.35, color: CREAM }}>
                      {blurb}
                    </p>
                  )
                )}
                <p style={{ margin: "0 0 2px", fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(251,243,236,0.85)" }}>{details}</p>
                {show.dj_name && (
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(251,243,236,0.85)" }}>Music by {show.dj_name}</p>
                )}
                <div style={{ height: 14 }} />
              </>
            )}

            {mode === "new" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, textAlign: "left" }}>
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

            {mode === "new" && voting && artist && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, textAlign: "left", fontSize: 13, lineHeight: 1.4, color: "rgba(251,243,236,0.85)", cursor: "pointer" }}>
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} style={{ width: 20, height: 20, margin: 0, flex: "none", accentColor: "var(--ln-accent)" }} />
                <span>
                  Share my name and email with {artist.display_name} <span style={{ color: "rgba(251,243,236,0.6)" }}>(optional)</span>
                </span>
              </label>
            )}

            <button onClick={submit} disabled={!ready || busy} style={{ ...cta(!!ready && !busy), marginTop: 14 }}>
              {busy ? "One moment…" : door ? "Check me in →" : "Let me in →"}
            </button>
            {error && <div style={{ marginTop: 10 }}><ErrorText>{error.text}</ErrorText></div>}

            <button
              onClick={() => {
                setMode(mode === "new" ? "returning" : "new");
                setError(null);
                setNotFound(false);
              }}
              style={{ ...textLink, padding: "8px 0", minHeight: 40 }}
            >
              {mode === "new" ? "Already RSVP'd?" : "New here? Enter your details"}
            </button>
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: "rgba(251,243,236,0.66)" }}>{consent}</p>
            <Footer venue={venue} artist={voting ? artist : null} client={client} />
          </main>
        </div>
      </div>
    </div>
  );
}
