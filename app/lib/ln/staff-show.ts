// lib/ln/staff-show.ts
//
// Show-night screens (door, host console) work on one of tonight's
// shows. A login limited to one series only ever sees its own; everyone
// else picks from tonight's shows when there's more than one.

import type { SupabaseClient } from "@supabase/supabase-js";
import { seriesScope, StaffUser } from "../admin/staff-auth";
import { getTonightShows, pickTonightShow, TonightShow, tonightLabel } from "./tonight";
import { todayEastern } from "./dates";
import { SHOW_COLUMNS, ShowRow } from "./shows";
import { SERIES_COLUMNS, SeriesRow } from "./series";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readShowId(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v) ? v : null;
}

export async function staffTonight(
  db: SupabaseClient,
  user: StaffUser,
  showId: unknown
): Promise<{ current: TonightShow | null; options: { id: string; label: string }[] }> {
  const { current, all } = await pickTonightShow(db, { seriesId: seriesScope(user), showId: readShowId(showId) });
  return { current, options: all.map((t) => ({ id: t.show.id, label: tonightLabel(t) })) };
}

// The host console's show. Hosts get tonight's shows only. Admins can also
// open any upcoming show to prep it (run of show, posts, the deck); going
// live and calling bingo still wait for show day (today = false).
export async function hostShow(
  db: SupabaseClient,
  user: StaffUser,
  showId: unknown
): Promise<{ current: TonightShow | null; options: { id: string; label: string }[]; today: boolean }> {
  const admin = user.role === "admin" || user.role === "super_admin";
  if (!admin) {
    const t = await staffTonight(db, user, showId);
    return { ...t, today: true };
  }
  const today = todayEastern();
  const tonight = await getTonightShows(db, null);
  const { data: later, error } = await db
    .from("ln_events")
    .select(SHOW_COLUMNS)
    .eq("archived", false)
    .gt("event_date", today)
    .order("event_date", { ascending: true })
    .order("event_start_time", { ascending: true })
    .limit(20)
    .returns<ShowRow[]>();
  if (error) throw error;
  const seriesIds = [...new Set((later ?? []).map((x) => x.series_id))];
  const { data: series, error: seriesError } = seriesIds.length
    ? await db.from("ln_series").select(SERIES_COLUMNS).in("id", seriesIds).returns<SeriesRow[]>()
    : { data: [] as SeriesRow[], error: null };
  if (seriesError) throw seriesError;
  const byId = new Map((series ?? []).map((x) => [x.id, x]));
  const upcoming: TonightShow[] = (later ?? []).flatMap((show) => {
    const sr = byId.get(show.series_id);
    return sr ? [{ show, series: sr }] : [];
  });

  const label = (t: TonightShow, isTonight: boolean) => {
    if (isTonight) return `Tonight · ${tonightLabel(t)}`;
    const d = new Date(`${t.show.event_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    return `${d} · ${t.series.name}`;
  };
  const options = [...tonight.map((t) => ({ id: t.show.id, label: label(t, true) })), ...upcoming.map((t) => ({ id: t.show.id, label: label(t, false) }))];
  const asked = readShowId(showId);
  const all = [...tonight, ...upcoming];
  const current = (asked && all.find((t) => t.show.id === asked)) || tonight[0] || upcoming[0] || null;
  return { current, options, today: !!current && current.show.event_date === today };
}
