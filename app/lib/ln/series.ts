// lib/ln/series.ts
//
// Series: a recurring Ladies Night (An Ode To Her, Please! A Ladies
// Night). Each has its own page at /ladies-night/<slug>, its own event
// logos and colors, and switches parts of the guest flow on or off.
// Clients are the presenters behind a series; their logo sits in the
// footer next to the venue and Gyal Dem.

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseRunningOrder } from "./show-rules";
import type { RunItem } from "./shows";

export const DEFAULT_SERIES_SLUG = "an-ode-to-her";
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SERIES_COLUMNS =
  "id, slug, name, client_id, default_venue_id, title_logo_url, presents_logo_url, cover_url, primary_color, accent_color, " +
  "tagline, schedule_note, feat_voting, feat_vip, feat_opentable, feat_door, feat_posh, feat_live, feat_reminder, posh_url, " +
  "call_delay_seconds, sort_order, active, created_at, " +
  "default_running_order, default_start_time, default_end_time, default_bingo_deck_id";

export type SeriesRow = {
  id: string;
  slug: string;
  name: string;
  client_id: string | null;
  default_venue_id: string | null;
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
  call_delay_seconds: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  // What every new show in the series starts from.
  default_running_order: RunItem[];
  default_start_time: string | null;
  default_end_time: string | null;
  default_bingo_deck_id: string | null;
};

export const CLIENT_COLUMNS = "id, name, instagram_handle, website_url, logo_url, contact_email, active";

export type ClientRow = {
  id: string;
  name: string;
  instagram_handle: string | null;
  website_url: string | null;
  logo_url: string | null;
  contact_email: string | null;
  active: boolean;
};

export type PublicClient = Pick<ClientRow, "name" | "instagram_handle" | "website_url" | "logo_url">;

// What the guest pages may know about a series.
export type PublicSeries = {
  slug: string;
  name: string;
  title_logo_url: string | null;
  presents_logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  tagline: string | null;
  schedule_note: string | null;
  features: {
    voting: boolean;
    vip: boolean;
    opentable: boolean;
    door: boolean;
    posh: boolean;
    live: boolean;
  };
  has_posh: boolean;
  client: PublicClient | null;
};

export function seriesPath(slug: string): string {
  return `/ladies-night/${slug}`;
}

export function livePath(slug: string): string {
  return `/ladies-night/${slug}/live`;
}

// A slug from a query string or body. Missing means the original series,
// so links and pages from before series existed keep working.
export function readSeriesSlug(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return DEFAULT_SERIES_SLUG;
  return typeof value === "string" && value.length <= 60 && SLUG.test(value) ? value : null;
}

export async function getSeriesBySlug(db: SupabaseClient, slug: string): Promise<SeriesRow | null> {
  const { data, error } = await db
    .from("ln_series")
    .select(SERIES_COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<SeriesRow>();
  if (error) throw error;
  return data;
}

export async function getSeriesById(db: SupabaseClient, id: string): Promise<SeriesRow | null> {
  const { data, error } = await db.from("ln_series").select(SERIES_COLUMNS).eq("id", id).maybeSingle<SeriesRow>();
  if (error) throw error;
  return data;
}

export async function getClient(db: SupabaseClient, id: string | null): Promise<ClientRow | null> {
  if (!id) return null;
  const { data, error } = await db.from("ln_clients").select(CLIENT_COLUMNS).eq("id", id).maybeSingle<ClientRow>();
  if (error) throw error;
  return data;
}

export function publicClient(c: ClientRow | null): PublicClient | null {
  if (!c || !c.active) return null;
  return { name: c.name, instagram_handle: c.instagram_handle, website_url: c.website_url, logo_url: c.logo_url };
}

export function publicSeries(s: SeriesRow, client: ClientRow | null): PublicSeries {
  return {
    slug: s.slug,
    name: s.name,
    title_logo_url: s.title_logo_url,
    presents_logo_url: s.presents_logo_url,
    cover_url: s.cover_url,
    primary_color: s.primary_color,
    accent_color: s.accent_color,
    tagline: s.tagline,
    schedule_note: s.schedule_note,
    features: {
      voting: s.feat_voting,
      vip: s.feat_vip,
      opentable: s.feat_opentable,
      door: s.feat_door,
      posh: s.feat_posh && !!s.posh_url,
      live: s.feat_live,
    },
    has_posh: s.feat_posh && !!s.posh_url,
    client: publicClient(client),
  };
}

// Who an RSVP is shared with, for the line under the RSVP button.
export function sharedWithName(s: SeriesRow, client: ClientRow | null): string | null {
  return client?.active ? client.name : null;
}

// ---------- Admin edits ----------

const HEX = /^#[0-9A-Fa-f]{6}$/;

function text(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : undefined;
}

export const SERIES_FEATURES = ["feat_voting", "feat_vip", "feat_opentable", "feat_door", "feat_posh", "feat_live", "feat_reminder"] as const;
export const SERIES_LOGO_FIELDS = ["title_logo_url", "presents_logo_url", "cover_url"] as const;

export type SeriesPatch = Partial<Omit<SeriesRow, "id" | "created_at">>;

export function brandFolderPublicUrl(kind: "series" | "clients" | "venues", id: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/ln-brand/${kind}/${id}/`;
}

export function parseSeriesPatch(
  body: Record<string, unknown>,
  seriesId: string | null
): { ok: true; value: SeriesPatch } | { ok: false; field: string; message: string } {
  const out: SeriesPatch = {};
  if ("name" in body) {
    const v = text(body.name, 80);
    if (!v) return { ok: false, field: "name", message: "Add the series name (80 characters max)." };
    out.name = v;
  }
  if ("slug" in body) {
    const v = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!SLUG.test(v) || v.length > 60) {
      return { ok: false, field: "slug", message: "Use lowercase letters, numbers, and dashes, like please or an-ode-to-her." };
    }
    if (["live", "api", "admin"].includes(v)) return { ok: false, field: "slug", message: "That link is reserved. Pick another." };
    out.slug = v;
  }
  for (const key of ["client_id", "default_venue_id", "default_bingo_deck_id"] as const) {
    if (key in body) {
      const v = body[key];
      if (v === null || v === "") out[key] = null;
      else if (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) out[key] = v;
      else return { ok: false, field: key, message: "Pick one from the list." };
    }
  }
  for (const key of ["primary_color", "accent_color"] as const) {
    if (key in body) {
      const v = text(body[key], 7);
      if (v === undefined || (v && !HEX.test(v))) return { ok: false, field: key, message: "Use a color like #6E1420." };
      out[key] = v ? v.toUpperCase() : null;
    }
  }
  if ("tagline" in body) {
    const v = text(body.tagline, 160);
    if (v === undefined) return { ok: false, field: "tagline", message: "Keep the tagline under 160 characters." };
    out.tagline = v;
  }
  if ("schedule_note" in body) {
    const v = text(body.schedule_note, 80);
    if (v === undefined) return { ok: false, field: "schedule_note", message: "Keep the schedule note under 80 characters." };
    out.schedule_note = v;
  }
  if ("default_running_order" in body) {
    const v = parseRunningOrder(body.default_running_order);
    if (typeof v === "string") return { ok: false, field: "default_running_order", message: v };
    out.default_running_order = v;
  }
  for (const key of ["default_start_time", "default_end_time"] as const) {
    if (key in body) {
      const v = body[key];
      if (v === null || v === "") out[key] = null;
      else if (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) out[key] = v.slice(0, 5);
      else return { ok: false, field: key, message: "Pick a time." };
    }
  }
  if ("posh_url" in body) {
    const v = text(body.posh_url, 500);
    if (v === undefined || (v && !/^https:\/\/(www\.)?posh\.vip\/\S+$/.test(v))) {
      return { ok: false, field: "posh_url", message: "Paste the Posh link, starting with https://posh.vip/" };
    }
    out.posh_url = v;
  }
  if ("call_delay_seconds" in body) {
    const v = body.call_delay_seconds;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 30) {
      return { ok: false, field: "call_delay_seconds", message: "Set a delay between 0 and 30 seconds." };
    }
    out.call_delay_seconds = v;
  }
  if ("sort_order" in body) {
    const v = body.sort_order;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1000) {
      return { ok: false, field: "sort_order", message: "Use a whole number." };
    }
    out.sort_order = v;
  }
  for (const key of [...SERIES_FEATURES, "active"] as const) {
    if (key in body) {
      if (typeof body[key] !== "boolean") return { ok: false, field: key, message: "Invalid setting." };
      out[key] = body[key] as boolean;
    }
  }
  for (const key of SERIES_LOGO_FIELDS) {
    if (key in body) {
      const v = text(body[key], 1000);
      if (v === undefined || (v && (!seriesId || !v.startsWith(brandFolderPublicUrl("series", seriesId))))) {
        return { ok: false, field: key, message: "Upload images through the Series screen." };
      }
      out[key] = v;
    }
  }
  return { ok: true, value: out };
}

export type ClientPatch = Partial<Omit<ClientRow, "id">>;

export function parseClientPatch(
  body: Record<string, unknown>,
  clientId: string | null
): { ok: true; value: ClientPatch } | { ok: false; field: string; message: string } {
  const out: ClientPatch = {};
  if ("name" in body) {
    const v = text(body.name, 80);
    if (!v) return { ok: false, field: "name", message: "Add the client's name (80 characters max)." };
    out.name = v;
  }
  if ("instagram_handle" in body) {
    const raw = text(body.instagram_handle, 31);
    const v = raw ? raw.replace(/^@/, "") : raw;
    if (v === undefined || (v && !/^[A-Za-z0-9._]{1,30}$/.test(v))) {
      return { ok: false, field: "instagram_handle", message: "Instagram handles use only letters, numbers, periods, and underscores." };
    }
    out.instagram_handle = v;
  }
  if ("website_url" in body) {
    const v = text(body.website_url, 300);
    if (v === undefined || (v && !/^https:\/\/[^\s]+\.[^\s]+/.test(v))) {
      return { ok: false, field: "website_url", message: "Use a full web address starting with https://" };
    }
    out.website_url = v;
  }
  if ("contact_email" in body) {
    const v = text(body.contact_email, 254);
    if (v === undefined || (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
      return { ok: false, field: "contact_email", message: "Check the email address." };
    }
    out.contact_email = v ? v.toLowerCase() : null;
  }
  if ("logo_url" in body) {
    const v = text(body.logo_url, 1000);
    if (v === undefined || (v && (!clientId || !v.startsWith(brandFolderPublicUrl("clients", clientId))))) {
      return { ok: false, field: "logo_url", message: "Upload the logo through the Clients screen." };
    }
    out.logo_url = v;
  }
  if ("active" in body) {
    if (typeof body.active !== "boolean") return { ok: false, field: "active", message: "Invalid active setting." };
    out.active = body.active;
  }
  return { ok: true, value: out };
}
