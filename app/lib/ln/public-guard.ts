// lib/ln/public-guard.ts
//
// Shared opening steps for the public guest routes: rate limit, the
// series the guest is on, then that series' current show and whether
// this request may RSVP to it.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rateLimit } from "./rate-limit";
import { getCurrentShow, guestStage, isValidDoorCode, rsvpOpen } from "./public-show";
import { getSeriesBySlug, readSeriesSlug, SeriesRow } from "./series";
import type { ShowRow } from "./shows";
import type { ShowStage } from "./show-status";

export type OpenShow = { show: ShowRow; series: SeriesRow; stage: ShowStage; door: boolean };

export function tooMany(): NextResponse {
  return NextResponse.json({ error: "too_many_requests", message: "Too many tries. Wait a minute and try again." }, { status: 429 });
}

// The series named in a query string or body (missing = An Ode To Her).
export async function loadSeries(
  db: SupabaseClient,
  slugValue: unknown
): Promise<{ ok: true; series: SeriesRow } | { ok: false; response: NextResponse }> {
  const slug = readSeriesSlug(slugValue);
  const series = slug ? await getSeriesBySlug(db, slug) : null;
  if (!series) return { ok: false, response: NextResponse.json({ error: "no_series" }, { status: 404 }) };
  return { ok: true, series };
}

// The series' current show, if it's one the guest can act on now.
export async function loadSeriesShow(
  db: SupabaseClient,
  slugValue: unknown
): Promise<{ ok: true; series: SeriesRow; show: ShowRow } | { ok: false; response: NextResponse }> {
  const s = await loadSeries(db, slugValue);
  if (!s.ok) return s;
  const show = await getCurrentShow(db, s.series.id);
  if (!show) return { ok: false, response: NextResponse.json({ error: "no_show" }, { status: 404 }) };
  return { ok: true, series: s.series, show };
}

export function doorCodeValid(series: SeriesRow, show: ShowRow, code: unknown): boolean {
  return series.feat_door && isValidDoorCode(show, typeof code === "string" ? code : null);
}

export async function loadOpenShow(
  db: SupabaseClient,
  slugValue: unknown,
  doorCode: unknown
): Promise<{ ok: true; value: OpenShow } | { ok: false; response: NextResponse }> {
  const loaded = await loadSeriesShow(db, slugValue);
  if (!loaded.ok) return loaded;
  const { series, show } = loaded;
  const stage = guestStage(show, series.feat_voting);
  const door = doorCodeValid(series, show, doorCode);
  if (!door && !rsvpOpen(stage)) {
    return { ok: false, response: NextResponse.json({ error: "rsvp_closed", stage }, { status: 409 }) };
  }
  return { ok: true, value: { show, series, stage, door } };
}

export function limited(req: NextRequest, name: string, perMinute: number): boolean {
  return !rateLimit(req, name, perMinute, 60_000);
}
