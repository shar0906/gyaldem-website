// app/api/admin/ladies-night/shows/route.ts
//
// Admin-only.
//
// GET  -> { shows, suggestion }
//   shows: every show, upcoming first (soonest at top), then past and
//   archived, each with its artist, stage, and ballot counts.
//   suggestion: a default date and voting window for the next show
//   (two weeks after the latest one), or null if there are no shows yet.
//
// POST -> create a show
//   Body: { event_date (required), title?, event_start_time?,
//           event_end_time?, artist_id?, gate_headline?, gate_description?,
//           rsvp_opens_at?, voting_opens_at?, voting_closes_at?,
//           opentable_widget?, vip_enabled?, vip_price_cents?, vip_perks?,
//           vip_cap? }
//   Voting window defaults to the suggested one when left out. The gate
//   description starts blank: no copy carries over from another show.
//   200 { success: true, show }
//   400 { error: "invalid", field, message }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { parseShowPatch } from "../../../../lib/ln/show-rules";
import { showStage } from "../../../../lib/ln/show-status";
import { SHOW_COLUMNS, ShowRow, checkBookableArtist } from "../../../../lib/ln/shows";
import { todayEastern } from "../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

type ArtistLite = { id: string; display_name: string; approved_at: string | null; active: boolean };

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
    stage: showStage(s),
    ballot: counts.get(s.id) ?? { draft: 0, published: 0 },
  }));
  const upcoming = list.filter((s) => !s.archived && s.event_date >= today);
  const rest = list.filter((s) => s.archived || s.event_date < today).reverse();

  // Default for the next show: two weeks after the latest one.
  let suggestion = null;
  const latest = [...(shows ?? [])].filter((s) => !s.archived).pop();
  if (latest) {
    const next = new Date(`${latest.event_date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 14);
    const nextDate = next.toISOString().slice(0, 10);
    const { data: win, error: winError } = await db.rpc("ln_suggest_next_event_window", { p_event_date: nextDate });
    if (winError) console.error("window suggestion failed:", winError);
    const w = Array.isArray(win) ? win[0] : win;
    suggestion = {
      event_date: nextDate,
      voting_opens_at: w?.voting_opens_at ?? null,
      voting_closes_at: w?.voting_closes_at ?? null,
    };
  }

  return NextResponse.json({ shows: [...upcoming, ...rest], suggestion });
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

  // ln_create_event creates the show and its public Events-page entry
  // together, and fills in the voting window when it's left out.
  const rpcArgs: Record<string, unknown> = {
    p_event_date: v.event_date,
    p_description: v.gate_description ?? null,
  };
  if (v.title) rpcArgs.p_title = v.title;
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
    artist_id: v.artist_id ?? null,
    gate_headline: v.gate_headline ?? null,
    gate_description: v.gate_description ?? null,
    rsvp_opens_at: v.rsvp_opens_at ?? null,
    opentable_widget: v.opentable_widget ?? null,
    ...(v.vip_enabled !== undefined && { vip_enabled: v.vip_enabled }),
    ...(v.vip_price_cents !== undefined && { vip_price_cents: v.vip_price_cents }),
    ...(v.vip_cap !== undefined && { vip_cap: v.vip_cap }),
    vip_perks: v.vip_perks ?? null,
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

  return NextResponse.json({ success: true, show: { ...show, stage: showStage(show) } });
}

