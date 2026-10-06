// lib/ln/public-show.ts
//
// What the public ballot page is allowed to see about the current show.
// Only approved artist profiles and published songs ever leave here;
// vote counts never do.

import type { SupabaseClient } from "@supabase/supabase-js";
import { easternToUtcIso, todayEastern } from "./dates";
import { SHOW_COLUMNS, ShowRow } from "./shows";
import { ShowStage, showStage } from "./show-status";

export const VIP_CLOSE_HOURS = 48;

// The show the ballot page is about: the soonest one today or later.
export async function getCurrentShow(db: SupabaseClient): Promise<ShowRow | null> {
  const { data, error } = await db
    .from("ln_events")
    .select(SHOW_COLUMNS)
    .eq("archived", false)
    .gte("event_date", todayEastern())
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle<ShowRow>();
  if (error) throw error;
  return data;
}

// The door QR only works on the night of the show.
export function isValidDoorCode(show: ShowRow, code: string | null | undefined): boolean {
  return !!code && code === show.door_code && show.event_date === todayEastern();
}

// RSVP is possible once it opens (or any time on show night via the door).
export function rsvpOpen(stage: ShowStage): boolean {
  return stage === "rsvp_open" || stage === "voting_open" || stage === "voting_closed";
}

export function vipClosesAt(show: ShowRow): Date {
  const start = new Date(easternToUtcIso(show.event_date, show.event_start_time));
  return new Date(start.getTime() - VIP_CLOSE_HOURS * 3600 * 1000);
}

export async function vipStatus(db: SupabaseClient, show: ShowRow) {
  const closesAt = vipClosesAt(show);
  if (!show.vip_enabled) return { enabled: false as const };

  const { data, error } = await db
    .from("ln_vip_orders")
    .select("quantity, status, expires_at")
    .eq("event_id", show.id);
  if (error) throw error;
  const now = Date.now();
  const held = (data ?? []).reduce(
    (n, o) => n + (o.status === "paid" || (o.status === "pending" && new Date(o.expires_at).getTime() > now) ? o.quantity : 0),
    0
  );
  const remaining = Math.max(0, show.vip_cap - held);
  return {
    enabled: true as const,
    price_cents: show.vip_price_cents,
    perks: show.vip_perks,
    closes_at: closesAt.toISOString(),
    closed: now >= closesAt.getTime(),
    sold_out: remaining === 0,
  };
}

export type PublicArtist = {
  display_name: string;
  photo_url: string | null;
  cover_url: string | null;
  logo_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  website_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
};

export async function publicArtist(db: SupabaseClient, artistId: string | null): Promise<PublicArtist | null> {
  if (!artistId) return null;
  const { data, error } = await db
    .from("ln_artists")
    .select("display_name, photo_url, cover_url, logo_url, bio, instagram_handle, website_url, primary_color, accent_color, approved_at, active")
    .eq("id", artistId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.approved_at || !data.active) return null;
  return {
    display_name: data.display_name,
    photo_url: data.photo_url,
    cover_url: data.cover_url,
    logo_url: data.logo_url,
    bio: data.bio,
    instagram_handle: data.instagram_handle,
    website_url: data.website_url,
    primary_color: data.primary_color,
    accent_color: data.accent_color,
  };
}

export async function publishedSongs(db: SupabaseClient, showId: string) {
  const { data, error } = await db
    .from("ln_event_songs")
    .select("song_id, sort_order, ln_repertoire(title, artist, artwork_url)")
    .eq("event_id", showId)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .returns<{ song_id: string; ln_repertoire: { title: string; artist: string; artwork_url: string | null } | null }[]>();
  if (error) throw error;
  return (data ?? []).flatMap((s) =>
    s.ln_repertoire ? [{ song_id: s.song_id, title: s.ln_repertoire.title, artist: s.ln_repertoire.artist, artwork_url: s.ln_repertoire.artwork_url }] : []
  );
}

export { showStage };
