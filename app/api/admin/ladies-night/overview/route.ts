// app/api/admin/ladies-night/overview/route.ts
//
// GET /api/admin/ladies-night/overview
// Admin-only (not artist — Kay proposes, she doesn't see this screen).
// Returns the LATEST non-archived event (the one being actively prepped —
// not necessarily whichever has voting open right now, since you'll
// often be building the next ballot while the current cycle is still
// live) plus every song on its ballot, draft and published, with vote
// counts where they exist (drafts always show 0 — voting is only
// possible once a song is published, so that's expected, not a bug).
//
// Untested draft — not run inside your repo yet.

import { NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const admin = serviceClient();

  const { data: event, error: eventError } = await admin
    .from("ln_events")
    .select("*")
    .eq("archived", false)
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("ln_current_event lookup failed:", eventError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!event) {
    return NextResponse.json({ event: null, songs: [] });
  }

  const { data: songs, error: songsError } = await admin
    .from("ln_event_songs")
    .select("song_id, status, sort_order, proposed_by, published_by, published_at, ln_repertoire(title, artist, category, artwork_url)")
    .eq("event_id", event.id)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true });

  if (songsError) {
    console.error("ln_event_songs lookup failed:", songsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: results, error: resultsError } = await admin
    .from("ln_results")
    .select("song_id, votes")
    .eq("event_id", event.id);

  if (resultsError) {
    console.error("ln_results lookup failed:", resultsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const votesBySong = new Map((results ?? []).map((r) => [r.song_id, r.votes]));

  const merged = (songs ?? []).map((s) => ({
    ...s,
    votes: votesBySong.get(s.song_id) ?? 0,
  }));

  return NextResponse.json({ event, songs: merged });
}