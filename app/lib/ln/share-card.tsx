// lib/ln/share-card.tsx
//
// The link-preview image for /ladies-night (what iMessage, Instagram DMs,
// WhatsApp, and X show when the link is shared): the artist's cover photo
// on the left, the show on the right, in the artist's colors.

import { ImageResponse } from "next/og";
import { ballotTheme } from "./theme";

export const SHARE_SIZE = { width: 1200, height: 630 };

export type ShareCardData = {
  title: string;
  artistName: string | null;
  dateText: string | null;
  coverUrl: string | null;
  primary: string | null;
  accent: string | null;
};

// Remote photos are fetched here so a slow or missing one never breaks the
// card. The image renderer handles JPG and PNG; other formats are skipped.
async function loadPhoto(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/image\/(jpe?g|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderShareCard(d: ShareCardData): Promise<ImageResponse> {
  const theme = ballotTheme(d.primary, d.accent);
  const photo = await loadPhoto(d.coverUrl);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: theme.deep, color: "#FBF3EC" }}>
        <div style={{ width: 470, height: "100%", display: "flex", position: "relative", background: theme.primary }}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={470} height={630} style={{ width: 470, height: 630, objectFit: "cover", objectPosition: "center 20%" }} />
          )}
          <div style={{ position: "absolute", inset: 0, display: "flex", background: `linear-gradient(90deg, rgba(0,0,0,0) 60%, ${theme.deep} 100%)` }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "56px 64px", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: "#D8B667" }}>Gyal Dem Social Club</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>{d.title}</div>
          {d.artistName && (
            <div style={{ display: "flex", fontSize: 40, color: theme.accentSoft, fontWeight: 700 }}>with {d.artistName}</div>
          )}
          {d.dateText && <div style={{ display: "flex", fontSize: 28, color: "rgba(251,243,236,0.85)" }}>{d.dateText} · Brooklyn Chop House</div>}
          <div
            style={{
              display: "flex",
              marginTop: 18,
              alignSelf: "flex-start",
              fontSize: 22,
              letterSpacing: 2,
              textTransform: "uppercase",
              padding: "12px 22px",
              borderRadius: 999,
              border: "2px solid rgba(216,182,103,0.6)",
              color: "#D8B667",
            }}
          >
            RSVP · Vote the set list
          </div>
        </div>
      </div>
    ),
    SHARE_SIZE
  );
}
