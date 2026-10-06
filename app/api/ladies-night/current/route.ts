// app/api/ladies-night/current/route.ts
//
// GET /api/ladies-night/current[?door=<code>]
// Public. Everything /ladies-night needs to draw the page for the current
// show: its stage, gate copy, the approved artist profile, published
// songs (once voting opens), VIP availability, and the OpenTable link.
// Never includes vote counts, guest data, or the door code itself.
//
//   { stage: "none" }                         no upcoming show
//   { stage: "coming_soon", rsvp_opens_at }   countdown only
//   { stage, door, show, artist, songs, vip } everything else
//
// door is true when ?door= matches tonight's show (the door QR), which
// also opens the gate on show night even before RSVP would otherwise.
//
// Voting only counts as open once the ballot is published; before that,
// the stage reads rsvp_open so guests never see an empty ballot.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import {
  getCurrentShow,
  isValidDoorCode,
  publicArtist,
  publishedSongs,
  showStage,
  vipStatus,
} from "../../../lib/ln/public-show";
import { getVenue, publicVenue } from "../../../lib/ln/venues";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ stage: "none" }, { headers: NO_STORE });

    const stage = showStage(show);
    const door = isValidDoorCode(show, req.nextUrl.searchParams.get("door"));

    if (stage === "coming_soon" && !door) {
      return NextResponse.json({ stage, rsvp_opens_at: show.rsvp_opens_at }, { headers: NO_STORE });
    }

    const showsSongs = stage === "voting_open" || stage === "voting_closed";
    const [artist, songs, vip, venue] = await Promise.all([
      publicArtist(db, show.artist_id),
      showsSongs ? publishedSongs(db, show.id) : Promise.resolve([]),
      vipStatus(db, show),
      getVenue(db, show.venue_id),
    ]);

    // The voting window can open before the ballot is published. Until it
    // is, guests see the RSVP-only flow instead of an empty ballot.
    const publicStage = stage === "voting_open" && songs.length === 0 ? "rsvp_open" : stage;

    return NextResponse.json(
      {
        stage: publicStage,
        door,
        show: {
          id: show.id,
          title: show.title,
          event_date: show.event_date,
          event_start_time: show.event_start_time,
          event_end_time: show.event_end_time,
          gate_headline: show.gate_headline,
          gate_description: show.gate_description,
          voting_opens_at: show.voting_opens_at,
          voting_closes_at: show.voting_closes_at,
          // The show's own OpenTable code wins; otherwise the venue's.
          opentable_url: show.opentable_widget ?? venue?.opentable_widget ?? null,
        },
        venue: publicVenue(venue),
        artist,
        songs,
        vip,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("current show failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
