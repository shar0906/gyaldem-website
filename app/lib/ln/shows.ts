// lib/ln/shows.ts
//
// Shared reads and checks for the admin Shows routes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { easternToUtcIso } from "./dates";

export const SHOW_COLUMNS =
  "id, slug, title, event_date, event_start_time, event_end_time, artist_id, gate_headline, gate_description, " +
  "rsvp_opens_at, voting_opens_at, voting_closes_at, opentable_widget, vip_enabled, vip_price_cents, vip_perks, " +
  "vip_cap, archived, public_event_id, created_at";

export type ShowRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  artist_id: string | null;
  gate_headline: string | null;
  gate_description: string | null;
  rsvp_opens_at: string | null;
  voting_opens_at: string;
  voting_closes_at: string;
  opentable_widget: string | null;
  vip_enabled: boolean;
  vip_price_cents: number;
  vip_perks: string | null;
  vip_cap: number;
  archived: boolean;
  public_event_id: string | null;
  created_at: string;
};

// An artist can be booked if they exist and are active. They don't need
// to be approved yet; publishing the ballot does require that.
export async function checkBookableArtist(
  db: SupabaseClient,
  artistId: string
): Promise<"ok" | "not_found" | "inactive" | "error"> {
  const { data, error } = await db.from("ln_artists").select("id, active").eq("id", artistId).maybeSingle();
  if (error) {
    console.error("artist check failed:", error);
    return "error";
  }
  if (!data) return "not_found";
  return data.active ? "ok" : "inactive";
}

// The public events table (the site's Events page) mirrors each show.
// Keeps its name, description, and times in step with show edits. Not
// fatal on failure: the show itself is already saved.
export async function syncPublicEvent(db: SupabaseClient, show: ShowRow): Promise<void> {
  if (!show.public_event_id) return;
  const { error } = await db
    .from("events")
    .update({
      name: show.title,
      description: show.gate_description,
      date: easternToUtcIso(show.event_date, show.event_start_time),
      end_date: easternToUtcIso(show.event_date, show.event_end_time),
      updated_at: new Date().toISOString(),
    })
    .eq("id", show.public_event_id);
  if (error) console.error("public event sync failed:", error);
}
