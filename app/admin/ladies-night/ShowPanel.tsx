// admin/ladies-night/ShowPanel.tsx
//
// The right side of the Shows screen, the same for every series:
//   1. The real sign-in page in a phone frame, drawn from what's in the
//      editor right now (saved or not).
//   2. A ready-for-show checklist.
//   3. Links: the page, the live page, the share link, the table placard.
//   4. The door QR, on series that use door check-in.
// Sticky beside the editor; it scrolls on its own when it's taller than
// the window.

"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenCurrent } from "../../ladies-night/shared";
import { GREEN, LINE, MUTED, PANEL, RED, button } from "./kit";

export type PanelSeries = {
  id: string;
  slug: string;
  name: string;
  client_id: string | null;
  title_logo_url: string | null;
  presents_logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  tagline: string | null;
  schedule_note: string | null;
  feat_voting: boolean;
  feat_vip: boolean;
  feat_opentable: boolean;
  feat_door: boolean;
  feat_posh: boolean;
  feat_live: boolean;
  feat_reminder: boolean;
  posh_url: string | null;
  default_running_order: { label: string; time: string | null }[];
};
export type PanelClient = { id: string; name: string; instagram_handle: string | null; website_url: string | null; logo_url: string | null; active: boolean };
export type PanelVenue = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  opentable_widget: string | null;
};
export type PanelArtist = {
  id: string;
  display_name: string;
  approved_at: string | null;
  photo_url: string | null;
  cover_url: string | null;
  logo_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  website_url?: string | null;
  primary_color: string | null;
  accent_color: string | null;
};

// What the panel needs from the editor's current values.
export type PanelDraft = {
  title: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  gate_headline: string;
  gate_description: string;
  rsvp_opens_at: string; // Eastern input value, "" when unset
  dj_name: string;
  theme_name: string;
  has_bingo: boolean;
  bingo_deck_id: string;
  running_order: string;
  opentable_widget: string;
  vip_enabled: boolean;
  reminder_enabled: boolean;
};

export type PanelSaved = {
  id: string;
  stage: string;
  reminder_broadcast_id: number | null;
  reminder_error: string | null;
} | null;

type Check = { ok: boolean; warn?: boolean; text: string; note?: string };

function checks(o: {
  draft: PanelDraft;
  series: PanelSeries;
  venue: PanelVenue | null;
  artist: PanelArtist | null;
  saved: PanelSaved;
  ballotPublished: boolean;
  paymentsMode: "test" | "live" | null | undefined;
}): Check[] {
  const { draft, series, venue, artist, saved } = o;
  const out: Check[] = [];
  out.push({ ok: !!draft.event_date && !!draft.event_start_time, text: "Date and times set" });
  out.push({ ok: !!draft.rsvp_opens_at, text: "RSVP opens time set", note: draft.rsvp_opens_at ? undefined : "Until it's set, the page only shows a countdown." });
  out.push({ ok: !!venue, text: "Venue picked" });
  if (venue) {
    const fullAddress = !!venue.address && /\d/.test(venue.address) && venue.address.includes(",");
    out.push({ ok: fullAddress, text: "Venue has its full address", note: fullAddress ? undefined : "Calendar invites use it. Add it in Venues." });
    out.push({ ok: !!venue.logo_url, warn: true, text: "Venue logo uploaded", note: venue.logo_url ? undefined : "The footer shows its name instead." });
  }
  if (series.feat_voting) {
    out.push({ ok: !!artist, text: "Artist booked" });
    if (artist) out.push({ ok: !!artist.approved_at, text: "Artist profile approved" });
    out.push({ ok: o.ballotPublished, text: "Ballot published", note: o.ballotPublished ? undefined : "Needs 10 songs and an approved artist." });
  }
  if (draft.has_bingo) {
    out.push({ ok: !!draft.bingo_deck_id, text: "Bingo deck picked", note: draft.bingo_deck_id ? undefined : "The host can't go live without one." });
  }
  if (series.feat_live) {
    const own = draft.running_order.trim().length > 0;
    const master = series.default_running_order.length > 0;
    out.push({ ok: own || master, warn: true, text: own ? "Run of show set" : master ? "Run of show: using the series default" : "Run of show set" });
  }
  if (series.feat_opentable) {
    const ot = !!draft.opentable_widget.trim() || !!venue?.opentable_widget;
    out.push({ ok: ot, warn: true, text: "OpenTable widget", note: ot ? undefined : "Add it on the venue, or the table step shows “opens soon”." });
  }
  if (series.feat_posh) out.push({ ok: !!series.posh_url, text: "Posh link set", note: series.posh_url ? undefined : "Add it in Series, or the Posh step stays hidden." });
  if (series.feat_vip && draft.vip_enabled) {
    out.push({ ok: o.paymentsMode === "live", text: "VIP: Stripe is live", note: o.paymentsMode === "test" ? "Test mode: payments aren't real." : o.paymentsMode === null ? "Stripe isn't set up." : undefined });
  }
  if (series.feat_reminder && draft.reminder_enabled && saved) {
    out.push({
      ok: !!saved.reminder_broadcast_id && !saved.reminder_error,
      warn: true,
      text: saved.reminder_broadcast_id ? "Reminder scheduled in Kit" : "Reminder email",
      note: saved.reminder_error ?? (saved.reminder_broadcast_id ? undefined : "Hands off to Kit in the week before the show."),
    });
  }
  if (!saved) out.push({ ok: false, text: "Show saved", note: "Create the show to go live with it." });
  return out;
}

// The editor's values in the shape the guest sign-in page reads.
export function previewCurrent(o: {
  draft: PanelDraft;
  series: PanelSeries;
  client: PanelClient | null;
  venue: PanelVenue | null;
  artist: PanelArtist | null;
}): OpenCurrent {
  const { draft, series, client, venue, artist } = o;
  return {
    stage: "rsvp_open",
    door: false,
    series: {
      slug: series.slug,
      name: series.name,
      title_logo_url: series.title_logo_url,
      presents_logo_url: series.presents_logo_url,
      cover_url: series.cover_url,
      primary_color: series.primary_color,
      accent_color: series.accent_color,
      tagline: series.tagline,
      schedule_note: series.schedule_note,
      features: {
        voting: series.feat_voting,
        vip: series.feat_vip,
        opentable: series.feat_opentable,
        door: series.feat_door,
        posh: series.feat_posh && !!series.posh_url,
        live: series.feat_live,
      },
      client: client && client.active ? { name: client.name, instagram_handle: client.instagram_handle, website_url: client.website_url, logo_url: client.logo_url } : null,
    },
    show: {
      id: "preview",
      title: draft.title,
      event_date: draft.event_date || new Date().toISOString().slice(0, 10),
      event_start_time: draft.event_start_time || "20:00",
      event_end_time: draft.event_end_time || "23:00",
      gate_headline: draft.gate_headline || null,
      gate_description: draft.gate_description || null,
      voting_opens_at: "",
      voting_closes_at: "",
      dj_name: draft.dj_name || null,
      theme_name: draft.theme_name || null,
      has_bingo: draft.has_bingo,
      opentable_url: null,
      posh_url: null,
    },
    venue: venue
      ? { name: venue.name, logo_url: venue.logo_url, website_url: venue.website_url, instagram_handle: venue.instagram_handle, address: venue.address }
      : null,
    artist:
      series.feat_voting && artist
        ? {
            display_name: artist.display_name,
            photo_url: artist.photo_url,
            cover_url: artist.cover_url,
            logo_url: artist.logo_url,
            bio: artist.bio,
            instagram_handle: artist.instagram_handle,
            website_url: artist.website_url ?? null,
            primary_color: artist.primary_color,
            accent_color: artist.accent_color,
          }
        : null,
    songs: [],
    vip: { enabled: false },
    live: null,
  } as unknown as OpenCurrent;
}

const PHONE_W = 390;
const PHONE_H = 844;
const SCALE = 0.62;

function PhoneFrame({ current }: { current: OpenCurrent }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(current);
  latest.current = current;

  // Send the newest values whenever they change, and again when the
  // preview page says it's ready (first load).
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "ln-gate-preview", current }, window.location.origin);
  }, [current]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "ln-gate-preview-ready") {
        frame.current?.contentWindow?.postMessage({ type: "ln-gate-preview", current: latest.current }, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div style={{ width: PHONE_W * SCALE + 16, height: PHONE_H * SCALE + 16, borderRadius: 34, background: "#111", padding: 8, boxSizing: "border-box", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", alignSelf: "center", flex: "none" }}>
      <div style={{ width: PHONE_W * SCALE, height: PHONE_H * SCALE, borderRadius: 26, overflow: "hidden", position: "relative" }}>
        <iframe
          ref={frame}
          src="/admin/gate-preview"
          title="Sign-in page preview"
          tabIndex={-1}
          style={{ width: PHONE_W, height: PHONE_H, border: 0, transform: `scale(${SCALE})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}
        />
      </div>
    </div>
  );
}

export default function ShowPanel(props: {
  draft: PanelDraft;
  series: PanelSeries;
  client: PanelClient | null;
  venue: PanelVenue | null;
  artist: PanelArtist | null;
  saved: PanelSaved;
  ballotPublished: boolean;
  paymentsMode: "test" | "live" | null | undefined;
  dirty: boolean;
}) {
  const { series, saved } = props;
  const [copied, setCopied] = useState(false);
  const current = previewCurrent(props);
  const list = checks(props);
  const blocking = list.filter((c) => !c.ok && !c.warn).length;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const pageUrl = `${origin}/ladies-night/${series.slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pageUrl.replace(/^https?:\/\/(www\.)?gyaldem-website[^/]*/, "https://gyaldemsocialclub.com"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const label = { fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: MUTED };

  return (
    <aside
      className="ln-shows-preview"
      style={{ position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label}>
          Sign-in page · {series.name}
          {props.dirty && <span style={{ color: RED }}> · unsaved</span>}
        </span>
        <PhoneFrame current={current} />
      </div>

      <section style={{ ...PANEL, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label}>Ready for the night {blocking === 0 ? <span style={{ color: GREEN }}>· all set</span> : <span style={{ color: RED }}>· {blocking} to do</span>}</span>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
          {list.map((c) => (
            <li key={c.text} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.4 }}>
              <span aria-hidden="true" style={{ color: c.ok ? GREEN : c.warn ? "#A8741A" : RED, fontWeight: 700, width: 14, flex: "none" }}>{c.ok ? "✓" : c.warn ? "!" : "✕"}</span>
              <span>
                {c.text}
                <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{c.ok ? " (done)" : " (to do)"}</span>
                {!c.ok && c.note && <span style={{ display: "block", fontSize: 12, color: MUTED }}>{c.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ ...PANEL, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label}>Links</span>
        <a href={`/ladies-night/${series.slug}`} target="_blank" rel="noopener" style={{ ...button("secondary"), textAlign: "center" }}>Open the page ↗</a>
        {series.feat_live && <a href={`/ladies-night/${series.slug}/live`} target="_blank" rel="noopener" style={{ ...button("secondary"), textAlign: "center" }}>Open the live page ↗</a>}
        <button onClick={copy} style={button("quiet")}>{copied ? "Copied ✓" : "Copy the share link"}</button>
        {series.feat_live && (
          <a href={`/api/admin/ladies-night/series/${series.id}/placard`} target="_blank" rel="noopener" style={{ ...button("quiet"), textAlign: "center" }}>Print table placard ↗</a>
        )}
      </section>

      {series.feat_door && (
        <section style={{ ...PANEL, padding: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <span style={{ ...label, alignSelf: "flex-start" }}>Door QR</span>
          {saved ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/admin/ladies-night/checkin/qr?show=${saved.id}`} alt="Door check-in QR code" width={180} height={180} style={{ display: "block" }} />
              <span style={{ fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 1.45 }}>
                Guests scan it at the door to RSVP and check in. It only works on the night of the show.
              </span>
              <a href={`/api/admin/ladies-night/checkin/qr?show=${saved.id}`} target="_blank" rel="noopener" style={button("quiet")}>Open to print ↗</a>
            </>
          ) : (
            <span style={{ fontSize: 12, color: MUTED }}>Save the show to get its door QR.</span>
          )}
        </section>
      )}
      <div style={{ borderTop: LINE, height: 0 }} />
    </aside>
  );
}
