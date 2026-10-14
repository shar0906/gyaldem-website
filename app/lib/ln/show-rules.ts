// lib/ln/show-rules.ts
//
// Validation for show settings coming from the admin Shows screen. Every
// field is optional so the same parser serves create (where the route
// checks required fields) and partial edits.

import type { RunItem } from "./shows";

export type ShowPatch = Partial<{
  title: string;
  event_date: string; // YYYY-MM-DD
  event_start_time: string; // HH:MM
  event_end_time: string; // HH:MM
  artist_id: string | null;
  venue_id: string | null;
  gate_headline: string | null;
  gate_description: string | null;
  rsvp_opens_at: string | null; // ISO timestamp
  voting_opens_at: string; // ISO timestamp
  voting_closes_at: string; // ISO timestamp
  opentable_widget: string | null; // the widget's loader URL only
  vip_enabled: boolean;
  vip_price_cents: number;
  vip_perks: string | null;
  vip_cap: number;
  archived: boolean;
  reminder_enabled: boolean;
  reminder_send_at: string | null;
  reminder_subject: string | null;
  reminder_body: string | null;
  series_id: string;
  dj_name: string | null;
  theme_name: string | null;
  bingo_deck_id: string | null;
  has_bingo: boolean;
  running_order: RunItem[];
  gallery_url: string | null;
  vip_closes_at: string | null;
}>;

type Result = { ok: true; value: ShowPatch } | { ok: false; field: string; error: string };

const RUN_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// The night's running order: up to 20 items, each a name and an optional
// start time ("21:30").
export function parseRunningOrder(items: unknown): RunItem[] | string {
  if (!Array.isArray(items)) return "Send the running order as a list.";
  if (items.length > 20) return "Keep the running order to 20 items.";
  const out: RunItem[] = [];
  for (const raw of items) {
    const r = raw as { label?: unknown; time?: unknown };
    const label = typeof r?.label === "string" ? r.label.trim() : "";
    const time = typeof r?.time === "string" && r.time.trim() ? r.time.trim().slice(0, 5) : null;
    if (!label || label.length > 80) return "Each item needs a name under 80 characters.";
    if (time && !RUN_TIME.test(time)) return "Use times like 21:30.";
    out.push({ label, time });
  }
  return out;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : undefined;
}

function isoTimestamp(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string" || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Admins paste whatever OpenTable gives them (usually a <script> tag).
// Only the loader URL is kept, and only if it's really OpenTable's, so
// the public page never runs pasted code. The page builds its own
// <script> tag from this URL.
export function extractOpenTableUrl(raw: string): string | null {
  // OpenTable's snippet often uses a protocol-relative src ("//www...").
  const match = raw.match(/(https:)?\/\/(www\.)?opentable\.com\/[^"'\s<>]+/i);
  let candidate = match ? match[0] : raw.trim();
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  try {
    const url = new URL(candidate.replace(/&amp;/g, "&"));
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "www.opentable.com" && url.hostname !== "opentable.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseShowPatch(body: Record<string, unknown>): Result {
  const out: ShowPatch = {};

  if ("title" in body) {
    const v = text(body.title, 120);
    if (!v) return { ok: false, field: "title", error: "Add a title under 120 characters." };
    out.title = v;
  }
  if ("event_date" in body) {
    if (typeof body.event_date !== "string" || !DATE.test(body.event_date)) {
      return { ok: false, field: "event_date", error: "Pick a show date." };
    }
    out.event_date = body.event_date;
  }
  for (const key of ["event_start_time", "event_end_time"] as const) {
    if (key in body) {
      if (typeof body[key] !== "string" || !TIME.test(body[key] as string)) {
        return { ok: false, field: key, error: "Use a time like 18:00." };
      }
      out[key] = body[key] as string;
    }
  }
  if ("artist_id" in body) {
    if (body.artist_id === null || body.artist_id === "") out.artist_id = null;
    else if (typeof body.artist_id === "string" && UUID.test(body.artist_id)) out.artist_id = body.artist_id;
    else return { ok: false, field: "artist_id", error: "Pick an artist from the list." };
  }
  if ("venue_id" in body) {
    if (body.venue_id === null || body.venue_id === "") out.venue_id = null;
    else if (typeof body.venue_id === "string" && UUID.test(body.venue_id)) out.venue_id = body.venue_id;
    else return { ok: false, field: "venue_id", error: "Pick a venue from the list." };
  }
  if ("gate_headline" in body) {
    const v = text(body.gate_headline, 120);
    if (v === undefined) return { ok: false, field: "gate_headline", error: "Keep the headline under 120 characters." };
    out.gate_headline = v;
  }
  if ("gate_description" in body) {
    const v = text(body.gate_description, 600);
    if (v === undefined) {
      return { ok: false, field: "gate_description", error: "Keep the description under 600 characters." };
    }
    out.gate_description = v;
  }
  if ("rsvp_opens_at" in body) {
    const v = isoTimestamp(body.rsvp_opens_at);
    if (v === undefined) return { ok: false, field: "rsvp_opens_at", error: "Pick when RSVP opens." };
    out.rsvp_opens_at = v;
  }
  for (const key of ["voting_opens_at", "voting_closes_at"] as const) {
    if (key in body) {
      const v = isoTimestamp(body[key]);
      if (!v) return { ok: false, field: key, error: "Pick a date and time." };
      out[key] = v;
    }
  }
  if (out.voting_opens_at && out.voting_closes_at && out.voting_opens_at >= out.voting_closes_at) {
    return { ok: false, field: "voting_closes_at", error: "Voting has to close after it opens." };
  }
  if ("opentable_widget" in body) {
    const raw = text(body.opentable_widget, 5000);
    if (raw === undefined) return { ok: false, field: "opentable_widget", error: "That widget code is too long." };
    if (raw === null) out.opentable_widget = null;
    else {
      const url = extractOpenTableUrl(raw);
      if (!url) {
        return {
          ok: false,
          field: "opentable_widget",
          error: "Paste the widget code from OpenTable. It should contain an opentable.com link.",
        };
      }
      out.opentable_widget = url;
    }
  }
  if ("vip_enabled" in body) {
    if (typeof body.vip_enabled !== "boolean") return { ok: false, field: "vip_enabled", error: "Invalid VIP setting." };
    out.vip_enabled = body.vip_enabled;
  }
  if ("vip_price_cents" in body) {
    const v = body.vip_price_cents;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 50 || v > 100000) {
      return { ok: false, field: "vip_price_cents", error: "Set a price between $0.50 and $1,000." };
    }
    out.vip_price_cents = v;
  }
  if ("vip_cap" in body) {
    const v = body.vip_cap;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1000) {
      return { ok: false, field: "vip_cap", error: "Set a cap between 0 and 1,000." };
    }
    out.vip_cap = v;
  }
  if ("vip_perks" in body) {
    const v = text(body.vip_perks, 300);
    if (v === undefined) return { ok: false, field: "vip_perks", error: "Keep the perks under 300 characters." };
    out.vip_perks = v;
  }
  if ("reminder_enabled" in body) {
    if (typeof body.reminder_enabled !== "boolean") return { ok: false, field: "reminder_enabled", error: "Invalid reminder setting." };
    out.reminder_enabled = body.reminder_enabled;
  }
  if ("reminder_send_at" in body) {
    const v = isoTimestamp(body.reminder_send_at);
    if (v === undefined) return { ok: false, field: "reminder_send_at", error: "Pick when the reminder sends." };
    out.reminder_send_at = v;
  }
  if ("reminder_subject" in body) {
    const v = text(body.reminder_subject, 150);
    if (v === undefined) return { ok: false, field: "reminder_subject", error: "Keep the subject under 150 characters." };
    out.reminder_subject = v;
  }
  if ("reminder_body" in body) {
    if (body.reminder_body === null || body.reminder_body === "") out.reminder_body = null;
    else if (typeof body.reminder_body === "string" && body.reminder_body.length <= 5000) out.reminder_body = body.reminder_body.trim();
    else return { ok: false, field: "reminder_body", error: "Keep the message under 5,000 characters." };
  }
  for (const key of ["series_id", "bingo_deck_id"] as const) {
    if (key in body) {
      const v = body[key];
      if (key === "bingo_deck_id" && (v === null || v === "")) out.bingo_deck_id = null;
      else if (typeof v === "string" && UUID.test(v)) out[key] = v;
      else return { ok: false, field: key, error: key === "series_id" ? "Pick a series." : "Pick a deck from the list." };
    }
  }
  if ("dj_name" in body) {
    const v = text(body.dj_name, 80);
    if (v === undefined) return { ok: false, field: "dj_name", error: "Keep the DJ name under 80 characters." };
    out.dj_name = v;
  }
  if ("theme_name" in body) {
    const v = text(body.theme_name, 60);
    if (v === undefined) return { ok: false, field: "theme_name", error: "Keep the theme under 60 characters." };
    out.theme_name = v;
  }
  if ("gallery_url" in body) {
    const v = text(body.gallery_url, 500);
    if (v === undefined || (v && !/^https:\/\/\S+\.\S+/.test(v))) {
      return { ok: false, field: "gallery_url", error: "Use a full link starting with https://" };
    }
    out.gallery_url = v;
  }
  if ("vip_closes_at" in body) {
    const v = isoTimestamp(body.vip_closes_at);
    if (v === undefined) return { ok: false, field: "vip_closes_at", error: "Pick when VIP sales close." };
    out.vip_closes_at = v;
  }
  if ("running_order" in body) {
    const v = parseRunningOrder(body.running_order);
    if (typeof v === "string") return { ok: false, field: "running_order", error: v };
    out.running_order = v;
  }
  if ("has_bingo" in body) {
    if (typeof body.has_bingo !== "boolean") return { ok: false, field: "has_bingo", error: "Invalid bingo setting." };
    out.has_bingo = body.has_bingo;
  }
  if ("archived" in body) {
    if (typeof body.archived !== "boolean") return { ok: false, field: "archived", error: "Invalid archive setting." };
    out.archived = body.archived;
  }

  // No bingo tonight means no deck, so the host console and live page
  // never show a half-set-up game.
  if (out.has_bingo === false) out.bingo_deck_id = null;

  return { ok: true, value: out };
}
