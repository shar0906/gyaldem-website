// app/api/admin/ladies-night/results/route.ts
//
// GET ?event_id=<id>              -> { show, totals, songs }   Admin-only.
// GET ?event_id=<id>&format=csv   -> ranked results as CSV
//
// Live while voting is open, final after. Songs ranked by votes (ties
// keep ballot order). "share" is the percent of voters who picked it.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { csvResponse, toCsv } from "../../../../lib/ln/csv";
import { showStage } from "../../../../lib/ln/show-status";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  const [showRes, resultsRes, orderRes, ballotsRes, rsvpRes] = await Promise.all([
    db
      .from("ln_events")
      .select("id, title, event_date, archived, rsvp_opens_at, voting_opens_at, voting_closes_at, artist_id, results_emailed_at, results_email_error")
      .eq("id", eventId)
      .maybeSingle(),
    db.from("ln_results").select("song_id, title, artist, votes").eq("event_id", eventId),
    db.from("ln_event_songs").select("song_id, sort_order").eq("event_id", eventId),
    db.from("ln_ballots").select("voter_id", { count: "exact", head: true }).eq("event_id", eventId),
    db.from("ln_rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);
  const failed = showRes.error ?? resultsRes.error ?? orderRes.error ?? ballotsRes.error ?? rsvpRes.error;
  if (failed) {
    console.error("results lookup failed:", failed);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!showRes.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const voters = ballotsRes.count ?? 0;
  const rsvps = rsvpRes.count ?? 0;
  const order = new Map((orderRes.data ?? []).map((r) => [r.song_id, r.sort_order as number]));

  const songs = (resultsRes.data ?? [])
    .map((r) => ({
      song_id: r.song_id as string,
      title: r.title as string,
      artist: r.artist as string,
      votes: (r.votes as number) ?? 0,
      share: voters ? Math.round((((r.votes as number) ?? 0) / voters) * 100) : 0,
    }))
    .sort((a, b) => b.votes - a.votes || (order.get(a.song_id) ?? 0) - (order.get(b.song_id) ?? 0))
    .map((s, i) => ({ rank: i + 1, ...s }));

  const totalVotes = songs.reduce((n, s) => n + s.votes, 0);
  const totals = {
    voters,
    rsvps,
    turnout: rsvps ? Math.round((voters / rsvps) * 100) : null,
    average_picks: voters ? Math.round((totalVotes / voters) * 10) / 10 : null,
    voting_closes_at: showRes.data.voting_closes_at,
  };

  if (req.nextUrl.searchParams.get("format") === "csv") {
    return csvResponse(
      `ladies-night-${showRes.data.event_date}-results.csv`,
      toCsv(
        ["Rank", "Song", "Artist", "Votes", "Percent of voters"],
        songs.map((s) => [s.rank, s.title, s.artist, s.votes, `${s.share}%`])
      )
    );
  }

  return NextResponse.json({
    show: { ...showRes.data, stage: showStage(showRes.data) },
    totals,
    songs,
  });
}
