// app/api/admin/ladies-night/my-event/route.ts
//
// GET /api/admin/ladies-night/my-event
// Artist-only. Returns the signed-in artist's next booked show (today or
// later, not archived) and the songs currently on that show's ballot.
// One artist per show, so every song on the ballot is theirs.
//
//   200 { event: null, songs: [] }                 no upcoming booking
//   200 { event: {...}, songs: [...] }
//   403 not a signed-in, active artist

import { NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../lib/admin/staff-auth";
import { todayEastern } from "../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const db = serviceClient();

  const { data: event, error: eventError } = await db
    .from("ln_events")
    .select("id, title, event_date, event_start_time, voting_opens_at, voting_closes_at")
    .eq("artist_id", auth.artist.id)
    .eq("archived", false)
    .gte("event_date", todayEastern())
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("my-event lookup failed:", eventError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!event) {
    return NextResponse.json({ event: null, songs: [] });
  }

  const { data: songs, error: songsError } = await db
    .from("ln_event_songs")
    .select("song_id, status, sort_order, ln_repertoire(title, artist, artwork_url, apple_track_id)")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  if (songsError) {
    console.error("my-event songs lookup failed:", songsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const ballotPublished = (songs ?? []).some((s) => s.status === "published");

  return NextResponse.json({
    event: { ...event, ballot_published: ballotPublished },
    songs: songs ?? [],
  });
}
