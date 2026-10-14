// app/ladies-night/page.tsx
//
// The Ladies Night hub: every series with its next night, each linking to
// its own page (/ladies-night/<series>).

import type { Metadata } from "next";
import { hubSeries, HubSeries } from "../lib/ln/hub";
import { serviceClient } from "../lib/admin/staff-auth";
import { ladiesNightViewport } from "../lib/ln/page-metadata";
import { ballotTheme } from "../lib/ln/theme";
import { siteUrl } from "../lib/ln/site";

export const revalidate = 60;
export const viewport = ladiesNightViewport;

export const metadata: Metadata = {
  title: "Ladies Night | Gyal Dem Social Club",
  description: "Ladies nights across Miami, hosted by Gyal Dem Social Club. Pick your night and RSVP.",
  alternates: { canonical: `${siteUrl()}/ladies-night` },
  openGraph: {
    title: "Ladies Night",
    description: "Ladies nights across Miami, hosted by Gyal Dem Social Club. Pick your night and RSVP.",
    url: `${siteUrl()}/ladies-night`,
    siteName: "Gyal Dem Social Club",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const CREAM = "#FBF3EC";
const GOLD = "#D8B667";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

function when(n: NonNullable<HubSeries["next"]>): string {
  return new Date(`${n.event_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function SeriesCard({ s }: { s: HubSeries }) {
  const theme = ballotTheme(s.next?.primary_color ?? s.primary_color, s.next?.accent_color ?? s.accent_color);
  const cover = s.next?.cover_url ?? s.cover_url;
  const position = (s.next?.cover_url ? s.next.cover_position : s.cover_position) ?? "center 25%";
  const presenter = s.client ? `${s.client.name} presents` : "Gyal Dem presents";
  return (
    <a
      href={`/ladies-night/${s.slug}`}
      className="ln-hub-card"
      style={{ display: "block", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(216,182,103,0.25)", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.7)", color: CREAM, textDecoration: "none" }}
    >
      <div
        style={{
          height: 150,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: cover
            ? `linear-gradient(180deg, rgba(0,0,0,0.1) 20%, ${theme.deep}EE), url("${cover}") ${position}/cover`
            : `radial-gradient(circle at 75% 15%, rgba(216,182,103,0.22), transparent 55%), linear-gradient(160deg, ${theme.primary}, ${theme.deep})`,
        }}
      >
        {s.title_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.title_logo_url} alt={s.name} style={{ height: 70, maxWidth: "70%", objectFit: "contain", filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.45))" }} />
        ) : (
          <span />
        )}
        {s.next?.theme_name && (
          <span style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(216,182,103,0.45)", color: GOLD, padding: "6px 11px", borderRadius: 999 }}>
            ✦ {s.next.theme_name}
          </span>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px", display: "grid", gap: 8, background: `linear-gradient(160deg, ${theme.primary} 0%, ${theme.deep} 100%)` }}>
        <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(251,243,236,0.7)" }}>{presenter}</span>
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 22 }}>{s.name}</span>
        {(s.tagline || s.next?.artist_name) && (
          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "rgba(251,243,236,0.8)" }}>
            {s.next?.artist_name ? `With ${s.next.artist_name}. ` : ""}
            {s.tagline ?? ""}
          </span>
        )}
        <span style={{ height: 1, background: "rgba(251,243,236,0.14)" }} />
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span>
            {s.next ? (
              <>
                <b>{when(s.next)}</b>
                {s.next.venue_name ? ` · ${s.next.venue_name}` : ""}
              </>
            ) : (
              s.schedule_note ?? "Next date coming soon"
            )}
          </span>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.next ? "RSVP →" : "See more →"}</span>
        </span>
      </div>
    </a>
  );
}

export default async function LadiesNightHub() {
  const series = await hubSeries(serviceClient()).catch(() => [] as HubSeries[]);
  return (
    <div style={{ minHeight: "100dvh", background: "#160C0E", color: CREAM, fontFamily: SANS }}>
      <style>{`
        html, body { background: #160C0E !important; }
        .ln-hub-card { transition: transform .2s ease, box-shadow .2s ease; }
        .ln-hub-card:hover { transform: translateY(-2px); }
        .ln-hub-card:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }
        .ln-hub-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 760px) { .ln-hub-grid { grid-template-columns: 1fr 1fr; } }
        @media (prefers-reduced-motion: reduce) { .ln-hub-card { transition: none; } }
      `}</style>
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "28px 16px calc(32px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 20 }}>
        <a href="/" aria-label="Gyal Dem Social Club home" style={{ alignSelf: "flex-start", display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem Social Club" style={{ height: 44, objectFit: "contain", display: "block" }} />
        </a>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 36, lineHeight: 1.05 }}>Ladies Night</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "rgba(251,243,236,0.8)" }}>Nights for the girls, across the city. Pick yours.</p>
        </div>
        {series.length === 0 ? (
          <p style={{ margin: 0, fontSize: 15, color: "rgba(251,243,236,0.75)" }}>The next nights are coming soon.</p>
        ) : (
          <div className="ln-hub-grid">
            {series.map((s) => (
              <SeriesCard key={s.slug} s={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
