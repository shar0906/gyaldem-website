// lib/ln/show-rules.ts
//
// Validation for show settings coming from the admin Shows screen. Every
// field is optional so the same parser serves create (where the route
// checks required fields) and partial edits.

export type ShowPatch = Partial<{
  title: string;
  event_date: string; // YYYY-MM-DD
  event_start_time: string; // HH:MM
  event_end_time: string; // HH:MM
  artist_id: string | null;
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
}>;

type Result = { ok: true; value: ShowPatch } | { ok: false; field: string; error: string };

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
  if ("archived" in body) {
    if (typeof body.archived !== "boolean") return { ok: false, field: "archived", error: "Invalid archive setting." };
    out.archived = body.archived;
  }

  return { ok: true, value: out };
}
