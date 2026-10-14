// app/api/admin/ladies-night/shows/route.ts
//
// Admin-only.
//
// GET  -> { shows, series, suggestion }
//   shows: every show, upcoming first (soonest at top), then past and
//   archived, each with its series, artist, stage, and ballot counts.
//   series: every series (for the picker and the show form).
//   suggestion: a default date and voting window for the next show
//   (two weeks after the latest one), or null if there are no shows yet.
//
// POST -> create a show
//   Body: { series_id (required), event_date (required), title?, event_start_time?,
//           event_end_time?, artist_id?, gate_headline?, gate_description?,
//           rsvp_opens_at?, voting_opens_at?, voting_closes_at?,
//           opentable_widget?, vip_enabled?, vip_price_cents?, vip_perks?,
//           vip_cap?, dj_name?, theme_name?, bingo_deck_id?, running_order?,
//           gallery_url?, vip_closes_at? }
//   Voting window defaults to the suggested one when left out. The venue
//   defaults to the series' venue. The gate description starts blank: no
//   copy carries over from another show. One show per series per date.
//   200 { success: true, show }
//   400 { error: "invalid", field, message }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { parseShowPatch } from "../../../../lib/ln/show-rules";
import { showStage } from "../../../../lib/ln/show-status";
import { SHOW_COLUMNS, ShowRow, checkBookableArtist, checkVenue, syncPublicEvent } from "../../../../lib/ln/shows";
import { todayEastern } from "../../../../lib/ln/dates";
import { stripeMode } from "../../../../lib/ln/stripe";
import { SERIES_COLUMNS, SeriesRow, getSeriesById, seriesPath } from "../../../../lib/ln/series";
import { siteUrl } from "../../../../lib/ln/site";
import { getVenue } from "../../../../lib/ln/venues";

export const dynamic = "force-dynamic";

type ArtistLite = { id: string; display_name: string; approved_at: string | null; active: boolean };
type VenueLite = { id: string; name: string };

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const db = serviceClient();

  const { data: shows, error } = await db
    .from("ln_events")
    .select(SHOW_COLUMNS)
    .order("event_date", { ascending: true })
    .returns<ShowRow[]>();
  if (error) {
    console.error("shows list failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const showIds = (shows ?? []).map((s) => s.id);
  const artistIds = [...new Set((shows ?? []).flatMap((s) => (s.artist_id ? [s.artist_id] : [])))];

  const { data: seriesList, error: seriesError } = await db
    .from("ln_series")
    .select(SERIES_COLUMNS)
    .order("sort_order", { ascending: true })
    .returns<SeriesRow[]>();
  if (seriesError) {
    console.error("series list failed:", seriesError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const seriesById = new Map((seriesList ?? []).map((s) => [s.id, s]));

  const venueIds = [...new Set((shows ?? []).flatMap((s) => (s.venue_id ? [s.venue_id] : [])))];
  const venuesRes = venueIds.length
    ? await db.from("ln_venues").select("id, name").in("id", venueIds).returns<VenueLite[]>()
    : { data: [] as VenueLite[], error: null };
  const venueById = new Map((venuesRes.data ?? []).map((v) => [v.id, v]));

  const [songsRes, artistsRes] = await Promise.all([
    showIds.length
      ? db.from("ln_event_songs").select("event_id, status").in("event_id", showIds)
      : Promise.resolve({ data: [], error: null }),
    artistIds.length
      ? db.from("ln_artists").select("id, display_name, approved_at, active").in("id", artistIds).returns<ArtistLite[]>()
      : Promise.resolve({ data: [] as ArtistLite[], error: null }),
  ]);
  if (songsRes.error || artistsRes.error) {
    console.error("shows detail lookup failed:", songsRes.error ?? artistsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const counts = new Map<string, { draft: number; published: number }>();
  for (const row of songsRes.data ?? []) {
    const c = counts.get(row.event_id) ?? { draft: 0, published: 0 };
    if (row.status === "published") c.published++;
    else c.draft++;
    counts.set(row.event_id, c);
  }
  const artistById = new Map((artistsRes.data ?? []).map((a) => [a.id, a]));

  const today = todayEastern();
  const list = (shows ?? []).map((s) => ({
    ...s,
    artist: s.artist_id ? artistById.get(s.artist_id) ?? null : null,
    venue: s.venue_id ? venueById.get(s.venue_id) ?? null : null,
    series: seriesById.has(s.series_id) ? { id: s.series_id, name: seriesById.get(s.series_id)!.name, slug: seriesById.get(s.series_id)!.slug } : null,
    stage: showStage(s, undefined, seriesById.get(s.series_id)?.feat_voting ?? true),
    ballot: counts.get(s.id) ?? { draft: 0, published: 0 },
  }));
  const upcoming = list.filter((s) => !s.archived && s.event_date >= today);
  const rest = list.filter((s) => s.archived || s.event_date < today).reverse();

  // Default date for a series' next show: two weeks after its latest one.
  // Only People's Choice series follow that rhythm; the others are booked
  // date by date.
  type Suggestion = { event_date: string; voting_opens_at: string | null; voting_closes_at: string | null };
  const suggestions: Record<string, Suggestion> = {};
  for (const sr of seriesList ?? []) {
    if (!sr.feat_voting) continue;
    const latest = (shows ?? []).filter((s) => !s.archived && s.series_id === sr.id).pop();
    if (!latest) continue;
    const next = new Date(`${latest.event_date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 14);
    const nextDate = next.toISOString().slice(0, 10);
    const { data: win, error: winError } = await db.rpc("ln_suggest_next_event_window", { p_event_date: nextDate });
    if (winError) console.error("window suggestion failed:", winError);
    const w = Array.isArray(win) ? win[0] : win;
    suggestions[sr.id] = {
      event_date: nextDate,
      voting_opens_at: w?.voting_opens_at ?? null,
      voting_closes_at: w?.voting_closes_at ?? null,
    };
  }

  return NextResponse.json({ shows: [...upcoming, ...rest], series: seriesList ?? [], suggestions, payments_mode: stripeMode() });
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const parsed = parseShowPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.error }, { status: 400 });
  }
  const v = parsed.value;
  if (!v.event_date) {
    return NextResponse.json({ error: "invalid", field: "event_date", message: "Pick a show date." }, { status: 400 });
  }
  if (v.archived) {
    return NextResponse.json({ error: "invalid", field: "archived", message: "New shows can't start archived." }, { status: 400 });
  }

  const db = serviceClient();

  if (!v.series_id) {
    return NextResponse.json({ error: "invalid", field: "series_id", message: "Pick a series." }, { status: 400 });
  }
  const series = await getSeriesById(db, v.series_id);
  if (!series) return NextResponse.json({ error: "invalid", field: "series_id", message: "Pick a series." }, { status: 400 });

  const { data: sameDay, error: sameDayError } = await db
    .from("ln_events")
    .select("id")
    .eq("series_id", series.id)
    .eq("event_date", v.event_date)
    .eq("archived", false)
    .limit(1);
  if (sameDayError) {
    console.error("same-day check failed:", sameDayError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (sameDay?.length) {
    return NextResponse.json({ error: "invalid", field: "event_date", message: `${series.name} already has a show on that date.` }, { status: 400 });
  }
  const venueId = v.venue_id === undefined ? series.default_venue_id : v.venue_id;
  const venue = venueId ? await getVenue(db, venueId).catch(() => null) : null;

  if (v.artist_id) {
    const check = await checkBookableArtist(db, v.artist_id);
    if (check === "error") return NextResponse.json({ error: "server_error" }, { status: 500 });
    if (check !== "ok") {
      return NextResponse.json(
        { error: "invalid", field: "artist_id", message: "That artist isn't available to book." },
        { status: 400 }
      );
    }
  }

  if (venueId) {
    const check = await checkVenue(db, venueId);
    if (check === "error") return NextResponse.json({ error: "server_error" }, { status: 500 });
    if (check !== "ok") {
      return NextResponse.json({ error: "invalid", field: "venue_id", message: "That venue isn't available." }, { status: 400 });
    }
  }

  // ln_create_event creates the show and its public Events-page entry
  // together, and fills in the voting window when it's left out.
  const rpcArgs: Record<string, unknown> = {
    p_event_date: v.event_date,
    p_description: v.gate_description ?? null,
    p_slug: `${series.slug}-${v.event_date}`,
    p_rsvp_link: `${siteUrl()}${seriesPath(series.slug)}`,
    p_title: v.title ?? (series.feat_voting ? "Ladies Night: An Ode To Her" : series.name),
    ...(venue && { p_location: venue.name }),
  };
  if (v.voting_opens_at) rpcArgs.p_voting_opens_at = v.voting_opens_at;
  if (v.voting_closes_at) rpcArgs.p_voting_closes_at = v.voting_closes_at;
  if (v.event_start_time) rpcArgs.p_start_time = v.event_start_time;
  if (v.event_end_time) rpcArgs.p_end_time = v.event_end_time;

  const { data: newId, error: createError } = await db.rpc("ln_create_event", rpcArgs);
  if (createError || !newId) {
    // 23505: a show with this date's slug already exists.
    if (createError?.code === "23505") {
      return NextResponse.json(
        { error: "invalid", field: "event_date", message: "There's already a show on that date." },
        { status: 400 }
      );
    }
    console.error("create show failed:", createError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const extras = {
    series_id: series.id,
    artist_id: series.feat_voting ? v.artist_id ?? null : null,
    venue_id: venueId ?? null,
    dj_name: v.dj_name ?? null,
    theme_name: v.theme_name ?? null,
    bingo_deck_id: v.bingo_deck_id ?? null,
    has_bingo: v.has_bingo ?? !!v.bingo_deck_id,
    gallery_url: v.gallery_url ?? null,
    ...(v.running_order !== undefined && { running_order: v.running_order }),
    ...(v.vip_closes_at !== undefined && { vip_closes_at: v.vip_closes_at }),
    gate_headline: v.gate_headline ?? null,
    gate_description: v.gate_description ?? null,
    rsvp_opens_at: v.rsvp_opens_at ?? null,
    opentable_widget: v.opentable_widget ?? null,
    ...(v.vip_enabled !== undefined && { vip_enabled: series.feat_vip && v.vip_enabled }),
    ...(v.vip_price_cents !== undefined && { vip_price_cents: v.vip_price_cents }),
    ...(v.vip_cap !== undefined && { vip_cap: v.vip_cap }),
    vip_perks: v.vip_perks ?? null,
    ...(v.reminder_enabled !== undefined && { reminder_enabled: v.reminder_enabled }),
    ...(v.reminder_send_at !== undefined && { reminder_send_at: v.reminder_send_at }),
    ...(v.reminder_subject !== undefined && { reminder_subject: v.reminder_subject }),
    ...(v.reminder_body !== undefined && { reminder_body: v.reminder_body }),
  };

  const { data: show, error: updateError } = await db
    .from("ln_events")
    .update(extras)
    .eq("id", newId)
    .select(SHOW_COLUMNS)
    .single<ShowRow>();
  if (updateError || !show) {
    console.error("create show settings failed:", updateError);
    return NextResponse.json({ error: "settings_not_saved", show_id: newId }, { status: 500 });
  }

  await syncPublicEvent(db, show);
  // The flyer, if one was uploaded before saving, goes on the Events entry.
  const flyer = typeof body.flyer_url === "string" && /^https:\/\/\S+$/.test(body.flyer_url) && body.flyer_url.length <= 1000 ? body.flyer_url : null;
  if (flyer && show.public_event_id) {
    const { error: flyerError } = await db.from("events").update({ flyer_url: flyer }).eq("id", show.public_event_id);
    if (flyerError) console.error("flyer save failed:", flyerError);
  }
  return NextResponse.json({ success: true, show: { ...show, stage: showStage(show, undefined, series?.feat_voting ?? true), flyer_url: flyer } });
}

