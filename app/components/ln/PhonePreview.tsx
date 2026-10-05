// components/ln/PhonePreview.tsx
//
// Phone-sized previews of an artist's gate and ballot, drawn from the
// same profile fields and colors guests will see. Used on the artist's
// Profile tab and in admin approvals, so both see exactly the same thing.

"use client";

import type { CSSProperties } from "react";
import { CREAM, CREAM_DIM, GOLD, INK, ballotTheme } from "../../lib/ln/theme";

export type PreviewProfile = {
  display_name: string;
  bio: string | null;
  instagram_handle: string | null;
  primary_color: string | null;
  accent_color: string | null;
  photo_url: string | null;
  cover_url: string | null;
};

const SAMPLE_SONGS = ["No Scrubs", "Sweet Love", "At Last"];
const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const frame: CSSProperties = {
  position: "relative",
  width: 250,
  height: 520,
  boxSizing: "border-box",
  border: "7px solid #2a2a2a",
  borderRadius: 32,
  overflow: "hidden",
  color: CREAM,
  fontFamily: SANS,
  flexShrink: 0,
};

export function GatePreview({ profile }: { profile: PreviewProfile }) {
  const theme = ballotTheme(profile.primary_color, profile.accent_color);
  const name = profile.display_name || "Your name";
  return (
    <div style={{ ...frame, background: "#2B2224" }} aria-label="Gate preview">
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 270,
          background: profile.cover_url
            ? `center top / cover no-repeat url("${profile.cover_url}")`
            : "linear-gradient(180deg, #4A3A3D, #2B2224)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!profile.cover_url && (
          <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(251,243,236,0.5)" }}>
            Your cover photo
          </span>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 255, borderBottom: "1px dashed rgba(216,182,103,0.75)" }} />
      <span style={{ position: "absolute", right: 8, top: 238, fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD }}>
        Visible above
      </span>
      <div
        style={{
          position: "absolute",
          inset: "auto 0 0 0",
          height: 390,
          display: "flex",
          alignItems: "flex-end",
          boxSizing: "border-box",
          padding: "0 14px 16px",
          background: "linear-gradient(180deg, rgba(18,13,14,0) 0%, rgba(18,13,14,0.6) 26%, #120D0E 54%, #120D0E 100%)",
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", textAlign: "center", gap: 7 }}>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 18 }}>Ladies Night: An Ode To Her</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={fieldStub} />
            <div style={fieldStub} />
          </div>
          <div style={fieldStub} />
          <span style={{ fontSize: 9, textAlign: "left", color: "rgba(251,243,236,0.8)" }}>☐ Share my name and email with {name}</span>
          <span
            style={{
              background: `linear-gradient(180deg, ${theme.accentSoft}, ${theme.accent})`,
              borderRadius: 7,
              padding: 9,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Let me in →
          </span>
          <span style={{ fontSize: 9.5, color: GOLD }}>Already RSVP&apos;d?</span>
        </div>
      </div>
    </div>
  );
}

const fieldStub: CSSProperties = {
  height: 26,
  borderRadius: 6,
  background: "rgba(251,243,236,0.08)",
  border: "1px solid rgba(251,243,236,0.22)",
};

export function BallotPreview({ profile, songs }: { profile: PreviewProfile; songs?: string[] }) {
  const theme = ballotTheme(profile.primary_color, profile.accent_color);
  const name = profile.display_name || "Your name";
  const list = songs && songs.length ? songs.slice(0, 3) : SAMPLE_SONGS;
  return (
    <div style={{ ...frame, background: theme.deep, padding: "14px 11px" }} aria-label="Ballot preview">
      <div
        style={{
          background: `linear-gradient(160deg, ${theme.primary} 0%, ${theme.deep} 100%)`,
          borderRadius: 13,
          padding: 13,
          border: "1px solid rgba(216,182,103,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(251,243,236,0.65)", marginBottom: 10 }}>
          <span>Ladies Night</span>
          <span style={{ color: GOLD }}>People&apos;s Choice</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: `1.5px solid ${GOLD}`,
              background: profile.photo_url ? `center / cover no-repeat url("${profile.photo_url}")` : "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SERIF,
              fontStyle: "italic",
              color: GOLD,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {!profile.photo_url && name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 15 }}>{name}</span>
            {profile.instagram_handle && <span style={{ fontSize: 8.5, color: GOLD }}>@{profile.instagram_handle}</span>}
          </div>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 19, lineHeight: 1.08 }}>
          People&apos;s Choice
          <span style={{ display: "block", color: theme.accentSoft }}>vote the set list</span>
        </div>
        {profile.bio && (
          <div style={{ fontSize: 8.5, lineHeight: 1.5, color: "rgba(251,243,236,0.8)", marginTop: 7, overflowWrap: "anywhere" }}>{profile.bio}</div>
        )}
      </div>
      <div style={{ background: CREAM, color: INK, borderRadius: 9, padding: "8px 10px", margin: "10px 0 7px", fontSize: 9.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          You&apos;ve picked <b>1</b> of 5
        </span>
        <span style={{ background: theme.accent, color: CREAM, fontWeight: 700, fontSize: 8, padding: "3px 7px", borderRadius: 999 }}>1 pick</span>
      </div>
      {list.map((title, i) => (
        <div
          key={title + i}
          style={{
            background: CREAM,
            color: INK,
            borderRadius: 9,
            padding: "8px 10px",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: `1.5px solid ${i === 0 ? theme.accent : "transparent"}`,
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 999, background: i === 0 ? theme.accent : CREAM_DIM, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        </div>
      ))}
    </div>
  );
}
