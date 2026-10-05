// app/api/admin/ladies-night/my-results/route.ts
//
// Artist-only. The Results tab.
//
// GET                         -> { shows }
//   The artist's shows (not archived), newest first, each marked
//   unlocked once voting has closed, with unlocks_at for the rest.
//
// GET ?event_id=<id>          -> { show, totals, songs, shared_guests }
//   Final results for one of their own shows. Only after voting closes.
//   shared_guests lists only guests who checked "Share my name and
//   email with [artist]".
//
// GET ?event_id=<id>&format=csv -> shared_guests as CSV
//
//   403 not an artist, or not their show
//   423 locked (voting hasn't closed yet) { unlocks_at }

import { NextRequest, NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../lib/admin/staff-auth";
import { csvResponse, toCsv } from "../../../../lib/ln/csv";

export const dynamic = "force-dynamic";

type SharedRow = {
  ln_voters: { first_name: string | null; last_name: string | null; name: string; email: string } | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const db = serviceClient();
  const now = Date.now();
  const eventId = req.nextUrl.searchParams.get("event_id");

  if (!eventId) {
    const { data, error } = await db
      .from("ln_events")
      .select("id, title, event_date, voting_closes_at")
      .eq("artist_id", auth.artist.id)
      .eq("archived", false)
      .order("event_date", { ascending: false });
    if (error) {
      console.error("my-results list failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    const shows = (data ?? []).map((s) => ({
      ...s,
      unlocked: new Date(s.voting_closes_at).getTime() <= now,
      unlocks_at: s.voting_closes_at,
    }));
    return NextResponse.json({ shows });
  }

  const { data: show, error: showError } = await db
    .from("ln_events")
    .select("id, title, event_date, artist_id, archived, voting_closes_at")
    .eq("id", eventId)
    .maybeSingle();
  if (showError) {
    console.error("my-results show lookup failed:", showError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!show || show.artist_id !== auth.artist.id || show.archived) {
    return NextResponse.json({ error: "not_your_show" }, { status: 403 });
  }
  if (new Date(show.voting_closes_at).getTime() > now) {
    return NextResponse.json({ error: "locked", unlocks_at: show.voting_closes_at }, { status: 423 });
  }

  const [resultsRes, orderRes, ballotsRes, sharedRes] = await Promise.all([
    db.from("ln_results").select("song_id, title, artist, votes").eq("event_id", eventId),
    db.from("ln_event_songs").select("song_id, sort_order").eq("event_id", eventId),
    db.from("ln_ballots").select("voter_id", { count: "exact", head: true }).eq("event_id", eventId),
    db
      .from("ln_rsvps")
      .select("ln_voters(first_name, last_name, name, email)")
      .eq("event_id", eventId)
      .eq("share_with_artist", true)
      .returns<SharedRow[]>(),
  ]);
  const failed = resultsRes.error ?? orderRes.error ?? ballotsRes.error ?? sharedRes.error;
  if (failed) {
    console.error("my-results lookup failed:", failed);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const sharedGuests = (sharedRes.data ?? [])
    .flatMap((r) => (r.ln_voters ? [r.ln_voters] : []))
    .map((v) => ({
      name: [v.first_name ?? v.name, v.last_name].filter(Boolean).join(" "),
      email: v.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (req.nextUrl.searchParams.get("format") === "csv") {
    return csvResponse(
      `ladies-night-${show.event_date}-guests.csv`,
      toCsv(["Name", "Email"], sharedGuests.map((g) => [g.name, g.email]))
    );
  }

  const voters = ballotsRes.count ?? 0;
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

  return NextResponse.json({
    show: { id: show.id, title: show.title, event_date: show.event_date },
    totals: { voters, top_pick: songs[0]?.title ?? null, sharing_with_you: sharedGuests.length },
    songs,
    shared_guests: sharedGuests,
  });
}
