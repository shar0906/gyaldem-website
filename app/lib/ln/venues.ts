// lib/ln/venues.ts
//
// Venues (restaurants) for Ladies Night. Managed by admins only; venues
// don't log in. Each show points at a venue. The venue's OpenTable widget
// is the default; a show can override it.

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractOpenTableUrl } from "./show-rules";

export const VENUE_COLUMNS = "id, name, address, logo_url, website_url, instagram_handle, opentable_widget, active";
export const BRAND_BUCKET = "ln-brand";

export type VenueRow = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  opentable_widget: string | null;
  active: boolean;
};

export type PublicVenue = Pick<VenueRow, "name" | "address" | "logo_url" | "website_url" | "instagram_handle">;

export async function getVenue(db: SupabaseClient, id: string | null): Promise<VenueRow | null> {
  if (!id) return null;
  const { data, error } = await db.from("ln_venues").select(VENUE_COLUMNS).eq("id", id).maybeSingle<VenueRow>();
  if (error) throw error;
  return data;
}

export function publicVenue(v: VenueRow | null): PublicVenue | null {
  if (!v) return null;
  return { name: v.name, address: v.address, logo_url: v.logo_url, website_url: v.website_url, instagram_handle: v.instagram_handle };
}

// "Brooklyn Chop House, Miami" for calendars and the Events page.
export function venueLocation(v: Pick<VenueRow, "name" | "address"> | null): string | null {
  if (!v) return null;
  return v.address ? `${v.name}, ${v.address}` : v.name;
}

export function venueFolderPublicUrl(venueId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BRAND_BUCKET}/venues/${venueId}/`;
}

type VenuePatch = Partial<Omit<VenueRow, "id">>;

function text(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : undefined;
}

export function parseVenuePatch(
  body: Record<string, unknown>,
  venueId: string | null
): { ok: true; value: VenuePatch } | { ok: false; field: string; message: string } {
  const out: VenuePatch = {};
  if ("name" in body) {
    const v = text(body.name, 80);
    if (!v) return { ok: false, field: "name", message: "Add the venue's name (80 characters max)." };
    out.name = v;
  }
  if ("address" in body) {
    const v = text(body.address, 200);
    if (v === undefined) return { ok: false, field: "address", message: "Keep the address under 200 characters." };
    out.address = v;
  }
  if ("website_url" in body) {
    const v = text(body.website_url, 300);
    if (v === undefined || (v && !/^https:\/\/[^\s]+\.[^\s]+/.test(v))) {
      return { ok: false, field: "website_url", message: "Use a full web address starting with https://" };
    }
    out.website_url = v;
  }
  if ("instagram_handle" in body) {
    const raw = text(body.instagram_handle, 31);
    const v = raw ? raw.replace(/^@/, "") : raw;
    if (v === undefined || (v && !/^[A-Za-z0-9._]{1,30}$/.test(v))) {
      return { ok: false, field: "instagram_handle", message: "Instagram handles use only letters, numbers, periods, and underscores." };
    }
    out.instagram_handle = v;
  }
  if ("opentable_widget" in body) {
    const raw = text(body.opentable_widget, 5000);
    if (raw === undefined) return { ok: false, field: "opentable_widget", message: "That widget code is too long." };
    if (raw === null) out.opentable_widget = null;
    else {
      const url = extractOpenTableUrl(raw);
      if (!url) return { ok: false, field: "opentable_widget", message: "Paste the widget code from OpenTable. It should contain an opentable.com link." };
      out.opentable_widget = url;
    }
  }
  if ("logo_url" in body) {
    const v = text(body.logo_url, 1000);
    if (v === undefined || (v && (!venueId || !v.startsWith(venueFolderPublicUrl(venueId))))) {
      return { ok: false, field: "logo_url", message: "Upload the logo through the Venues screen." };
    }
    out.logo_url = v;
  }
  if ("active" in body) {
    if (typeof body.active !== "boolean") return { ok: false, field: "active", message: "Invalid active setting." };
    out.active = body.active;
  }
  return { ok: true, value: out };
}
