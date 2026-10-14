// lib/ln/hub.ts
//
// The /ladies-night page: every active series with its next show.

import type { SupabaseClient } from "@supabase/supabase-js";
import { showColors } from "./theme";
import { todayEastern } from "./dates";
import { CLIENT_COLUMNS, ClientRow, PublicSeries, SERIES_COLUMNS, SeriesRow, publicSeries } from "./series";
import { publicArtist } from "./public-show";

export type HubSeries = PublicSeries & {
  next: {
    event_date: string;
    event_start_time: string;
    theme_name: string | null;
    venue_name: string | null;
    artist_name: string | null;
    cover_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
  } | null;
};

type NextRow = {
  series_id: string;
  event_date: string;
  event_start_time: string;
  theme_name: string | null;
  artist_id: string | null;
  cover_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  public_event_id: string | null;
  ln_venues: { name: string } | null;
};

export async function hubSeries(db: SupabaseClient): Promise<HubSeries[]> {
  const { data: series, error } = await db
    .from("ln_series")
    .select(SERIES_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<SeriesRow[]>();
  if (error) throw error;
  if (!series?.length) return [];

  const clientIds = [...new Set(series.flatMap((s) => (s.client_id ? [s.client_id] : [])))];
  const [clientsRes, showsRes] = await Promise.all([
    clientIds.length
      ? db.from("ln_clients").select(CLIENT_COLUMNS).in("id", clientIds).returns<ClientRow[]>()
      : Promise.resolve({ data: [] as ClientRow[], error: null }),
    db
      .from("ln_events")
      .select("series_id, event_date, event_start_time, theme_name, artist_id, cover_url, primary_color, accent_color, public_event_id, ln_venues(name)")
      .in("series_id", series.map((s) => s.id))
      .eq("archived", false)
      .gte("event_date", todayEastern())
      .order("event_date", { ascending: true })
      .returns<NextRow[]>(),
  ]);
  if (clientsRes.error || showsRes.error) throw clientsRes.error ?? showsRes.error;
  const clientById = new Map((clientsRes.data ?? []).map((c) => [c.id, c]));
  // A show whose events listing is still a draft isn't on the hub yet.
  const eventIds = (showsRes.data ?? []).flatMap((r) => (r.public_event_id ? [r.public_event_id] : []));
  const drafts = new Set<string>();
  if (eventIds.length) {
    const { data: draftRows, error: draftErr } = await db
      .from("events")
      .select("id")
      .in("id", eventIds)
      .eq("status", "draft")
      .returns<{ id: string }[]>();
    if (draftErr) throw draftErr;
    for (const d of draftRows ?? []) drafts.add(d.id);
  }

  const nextBySeries = new Map<string, NextRow>();
  for (const row of showsRes.data ?? []) {
    if (row.public_event_id && drafts.has(row.public_event_id)) continue;
    if (!nextBySeries.has(row.series_id)) nextBySeries.set(row.series_id, row);
  }

  return Promise.all(
    series.map(async (s) => {
      const n = nextBySeries.get(s.id);
      const artist = n && s.feat_voting ? await publicArtist(db, n.artist_id) : null;
      return {
        ...publicSeries(s, s.client_id ? clientById.get(s.client_id) ?? null : null),
        next: n
          ? {
              event_date: n.event_date,
              event_start_time: n.event_start_time,
              theme_name: n.theme_name,
              venue_name: n.ln_venues?.name ?? null,
              artist_name: artist?.display_name ?? null,
              cover_url: n.cover_url ?? artist?.cover_url ?? null,
              ...(() => {
                const c = showColors(n, artist, s, s.feat_voting);
                return { primary_color: c.primary, accent_color: c.accent };
              })(),
            }
          : null,
      };
    })
  );
}
