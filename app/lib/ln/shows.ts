// lib/ln/shows.ts
//
// Shared reads and checks for the admin Shows routes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getVenue } from "./venues";

export const SHOW_COLUMNS =
  "id, slug, title, event_date, event_start_time, event_end_time, artist_id, venue_id, gate_headline, gate_description, " +
  "rsvp_opens_at, voting_opens_at, voting_closes_at, opentable_widget, vip_enabled, vip_price_cents, vip_perks, " +
  "vip_cap, archived, public_event_id, door_code, results_emailed_at, results_email_error, reminder_enabled, reminder_send_at, " +
  "reminder_subject, reminder_body, reminder_broadcast_id, reminder_scheduled_at, reminder_error, created_at";

export type ShowRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  artist_id: string | null;
  venue_id: string | null;
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
  door_code: string;
  results_emailed_at: string | null;
  results_email_error: string | null;
  reminder_enabled: boolean;
  reminder_send_at: string | null;
  reminder_subject: string | null;
  reminder_body: string | null;
  reminder_broadcast_id: number | null;
  reminder_scheduled_at: string | null;
  reminder_error: string | null;
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

export async function checkVenue(db: SupabaseClient, venueId: string): Promise<"ok" | "not_found" | "inactive" | "error"> {
  const { data, error } = await db.from("ln_venues").select("id, active").eq("id", venueId).maybeSingle();
  if (error) {
    console.error("venue check failed:", error);
    return "error";
  }
  if (!data) return "not_found";
  return data.active ? "ok" : "inactive";
}

// The public events table (the site's Events page) mirrors each show.
// Keeps its name, description, location, and times in step with show
// edits. Not fatal on failure: the show itself is already saved.
export async function syncPublicEvent(db: SupabaseClient, show: ShowRow): Promise<void> {
  if (!show.public_event_id) return;
  const venue = await getVenue(db, show.venue_id).catch(() => null);
  const { error } = await db
    .from("events")
    .update({
      ...(venue && { location: venue.name }),
      name: show.title,
      description: show.gate_description,
      date: `${show.event_date}T12:00:00.000Z`,
      end_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", show.public_event_id);
  if (error) console.error("public event sync failed:", error);
}
