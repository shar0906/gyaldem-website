// app/api/ladies-night/current/route.ts
//
// GET /api/ladies-night/current?series=<slug>[&door=<code>]
// Public. Everything a series page needs to draw the current show: the
// series (event logos, colors, which parts are on), the show's stage and
// details, the approved artist (voting series), published songs (once
// voting opens), VIP, OpenTable, Posh, and the live state. Never
// includes vote counts, guest data, or the door code itself.
// series defaults to an-ode-to-her.
//
//   { stage: "none", series, last? }          no upcoming show
//   { stage: "coming_soon", series, rsvp_opens_at, show_date, last? }
//   { stage, door, series, show, artist, songs, vip, venue, live }
//
// last: the most recent past show (its date, gallery link, and winners),
// for the page between shows.
//
// door is true when ?door= matches tonight's show (the door QR), which
// also opens the gate on show night even before RSVP would otherwise.
//
// Voting only counts as open once the ballot is published; before that,
// the stage reads rsvp_open so guests never see an empty ballot. Series
// without voting never show a voting stage.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import {
  getCurrentShow,
  getLastShow,
  guestStage,
  liveState,
  publicArtist,
  publishedSongs,
  vipStatus,
} from "../../../lib/ln/public-show";
import { getVenue, publicVenue } from "../../../lib/ln/venues";
import { getClient, publicSeries } from "../../../lib/ln/series";
import { doorCodeValid, loadSeries } from "../../../lib/ln/public-guard";
import type { ShowRow } from "../../../lib/ln/shows";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function lastShowSummary(db: SupabaseClient, seriesId: string) {
  const last = await getLastShow(db, seriesId);
  if (!last) return null;
  const { data: winners } = await db
    .from("ln_live_posts")
    .select("body")
    .eq("event_id", last.id)
    .eq("kind", "winner")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(6);
  return {
    event_date: last.event_date,
    theme_name: last.theme_name,
    gallery_url: last.gallery_url,
    winners: (winners ?? []).map((w) => w.body as string),
  };
}

function showDetails(show: ShowRow, opentable: string | null, posh: string | null) {
  return {
    id: show.id,
    title: show.title,
    event_date: show.event_date,
    event_start_time: show.event_start_time,
    event_end_time: show.event_end_time,
    gate_headline: show.gate_headline,
    gate_description: show.gate_description,
    voting_opens_at: show.voting_opens_at,
    voting_closes_at: show.voting_closes_at,
    dj_name: show.dj_name,
    theme_name: show.theme_name,
    has_bingo: !!show.bingo_deck_id,
    opentable_url: opentable,
    posh_url: posh,
  };
}

export async function GET(req: NextRequest) {
  const db = serviceClient();
  try {
    const loaded = await loadSeries(db, req.nextUrl.searchParams.get("series"));
    if (!loaded.ok) return loaded.response;
    const { series } = loaded;
    const client = await getClient(db, series.client_id);
    const seriesView = publicSeries(series, client);

    const show = await getCurrentShow(db, series.id);
    if (!show) {
      // No date yet: the footer still shows the series' usual venue.
      const usual = await getVenue(db, series.default_venue_id);
      return NextResponse.json(
        { stage: "none", series: seriesView, venue: publicVenue(usual), artist: null, last: await lastShowSummary(db, series.id) },
        { headers: NO_STORE }
      );
    }

    const stage = guestStage(show, series.feat_voting);
    const door = doorCodeValid(series, show, req.nextUrl.searchParams.get("door"));

    if (stage === "coming_soon" && !door) {
      const [soonVenue, soonArtist] = await Promise.all([
        getVenue(db, show.venue_id),
        series.feat_voting ? publicArtist(db, show.artist_id) : Promise.resolve(null),
      ]);
      return NextResponse.json(
        {
          stage,
          series: seriesView,
          rsvp_opens_at: show.rsvp_opens_at,
          show_date: show.event_date,
          venue: publicVenue(soonVenue),
          artist: soonArtist,
          last: await lastShowSummary(db, series.id),
        },
        { headers: NO_STORE }
      );
    }

    const showsSongs = series.feat_voting && (stage === "voting_open" || stage === "voting_closed");
    const [artist, songs, vip, venue] = await Promise.all([
      series.feat_voting ? publicArtist(db, show.artist_id) : Promise.resolve(null),
      showsSongs ? publishedSongs(db, show.id) : Promise.resolve([]),
      series.feat_vip ? vipStatus(db, show) : Promise.resolve({ enabled: false as const }),
      getVenue(db, show.venue_id),
    ]);

    // The voting window can open before the ballot is published. Until it
    // is, guests see the RSVP-only flow instead of an empty ballot.
    const publicStage = stage === "voting_open" && songs.length === 0 ? "rsvp_open" : stage;

    // The show's own OpenTable code wins; otherwise the venue's.
    const opentable = series.feat_opentable ? show.opentable_widget ?? venue?.opentable_widget ?? null : null;
    const posh = series.feat_posh ? series.posh_url : null;

    return NextResponse.json(
      {
        stage: publicStage,
        door,
        series: seriesView,
        show: showDetails(show, opentable, posh),
        venue: publicVenue(venue),
        artist,
        songs,
        vip,
        live: series.feat_live ? { state: liveState(show), started_at: show.live_started_at } : null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("current show failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
