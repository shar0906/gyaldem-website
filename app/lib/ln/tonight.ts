// lib/ln/tonight.ts
//
// Tonight's shows, for the door, the host console, and the live page.
// "Tonight" is today's date in Eastern time. Several series can have a
// show on the same night; a staff login scoped to one series only ever
// sees that series' show.

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayEastern } from "./dates";
import { SHOW_COLUMNS, ShowRow } from "./shows";
import { SERIES_COLUMNS, SeriesRow, seriesPath } from "./series";
import { siteUrl } from "./site";

export { siteUrl };

export type TonightShow = { show: ShowRow; series: SeriesRow };

// Every show tonight (optionally only one series), soonest start first.
export async function getTonightShows(db: SupabaseClient, seriesId: string | null = null): Promise<TonightShow[]> {
  let q = db.from("ln_events").select(SHOW_COLUMNS).eq("archived", false).eq("event_date", todayEastern());
  if (seriesId) q = q.eq("series_id", seriesId);
  const { data, error } = await q.order("event_start_time", { ascending: true }).returns<ShowRow[]>();
  if (error) throw error;
  const shows = data ?? [];
  if (!shows.length) return [];
  const ids = [...new Set(shows.map((s) => s.series_id))];
  const { data: series, error: seriesError } = await db.from("ln_series").select(SERIES_COLUMNS).in("id", ids).returns<SeriesRow[]>();
  if (seriesError) throw seriesError;
  const byId = new Map((series ?? []).map((s) => [s.id, s]));
  return shows.flatMap((show) => {
    const s = byId.get(show.series_id);
    return s ? [{ show, series: s }] : [];
  });
}

// The one show a show-night screen is working on: the one asked for (if
// it's tonight and in scope), otherwise the first of tonight's shows.
export async function pickTonightShow(
  db: SupabaseClient,
  opts: { seriesId: string | null; showId?: string | null }
): Promise<{ current: TonightShow | null; all: TonightShow[] }> {
  const all = await getTonightShows(db, opts.seriesId);
  const current = (opts.showId && all.find((t) => t.show.id === opts.showId)) || all[0] || null;
  return { current, all };
}

export function doorUrl(show: ShowRow, series: Pick<SeriesRow, "slug">): string {
  return `${siteUrl()}${seriesPath(series.slug)}?door=${encodeURIComponent(show.door_code)}`;
}

// Short label for show pickers: "Please! A Ladies Night · 8:00 PM"
export function tonightLabel(t: TonightShow): string {
  const [h, m] = t.show.event_start_time.split(":").map(Number);
  const time = new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return `${t.series.name} · ${time}`;
}
