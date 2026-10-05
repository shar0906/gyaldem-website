// app/api/admin/ladies-night/propose/route.ts
//
// POST /api/admin/ladies-night/propose
// Body: { event_id: string, songs: Array<{
//   repertoire_id?: string | null,   // re-adding a song from their library
//   title: string, artist: string,
//   artwork_url: string | null, apple_track_id: number | null,
//   apple_music_url: string | null
// }> }
//
// Artist-only, for their own upcoming show. The submitted list REPLACES
// the show's draft ballot (in the order given), so removing a song from
// the working list and resubmitting actually removes it. At least 10
// distinct songs. Rejected once the ballot is published, so votes are
// never cast against a list that later changes.
//
// How each song resolves to a catalog id:
//   1. repertoire_id set: must already be in this artist's library.
//   2. apple_track_id set: reuses the catalog row for that track if one
//      exists (from any artist), otherwise adds it. Never overwrites it.
//   3. neither: a manual entry (jazz standards, etc.), always added new.
// Every resolved song is also added to the artist's library.
//
//   200 { success: true, proposed: n }
//   400 missing_fields | invalid_song | not_enough_songs | unknown_song
//   403 not an artist, or not their show
//   409 ballot_published

import { NextRequest, NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../lib/admin/staff-auth";
import { todayEastern } from "../../../../lib/ln/dates";
import { addToLibrary, CleanSong, cleanSong, resolveSongIds } from "../../../../lib/ln/songs";

const MIN_SONGS_TO_PROPOSE = 10;
const MAX_SONGS_TO_PROPOSE = 60;

export async function POST(req: NextRequest) {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { user, artist } = auth;

  const body = (await req.json().catch(() => null)) as { event_id?: unknown; songs?: unknown } | null;
  const eventId = typeof body?.event_id === "string" ? body.event_id : null;
  if (!eventId || !Array.isArray(body?.songs)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (body.songs.length > MAX_SONGS_TO_PROPOSE) {
    return NextResponse.json({ error: "too_many_songs", max: MAX_SONGS_TO_PROPOSE }, { status: 400 });
  }

  const songs: CleanSong[] = [];
  for (const raw of body.songs) {
    const song = cleanSong(raw);
    if (!song) return NextResponse.json({ error: "invalid_song" }, { status: 400 });
    songs.push(song);
  }

  const db = serviceClient();

  // The show must be this artist's, upcoming, and not archived.
  const { data: event, error: eventError } = await db
    .from("ln_events")
    .select("id, artist_id, archived, event_date")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) {
    console.error("propose: event lookup failed:", eventError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!event || event.artist_id !== artist.id || event.archived || event.event_date < todayEastern()) {
    return NextResponse.json({ error: "not_your_show" }, { status: 403 });
  }

  const { count: publishedCount, error: publishedError } = await db
    .from("ln_event_songs")
    .select("song_id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "published");
  if (publishedError) {
    console.error("propose: published check failed:", publishedError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if ((publishedCount ?? 0) > 0) {
    return NextResponse.json({ error: "ballot_published" }, { status: 409 });
  }

  const resolved = await resolveSongIds(db, artist.id, songs);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const orderedIds = resolved.ids;

  if (orderedIds.length < MIN_SONGS_TO_PROPOSE) {
    return NextResponse.json(
      { error: "not_enough_songs", have: orderedIds.length, need: MIN_SONGS_TO_PROPOSE },
      { status: 400 }
    );
  }

  // Everything proposed lands in the artist's library.
  if (!(await addToLibrary(db, artist.id, orderedIds))) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Write the new list first, then remove drafts that are no longer on it.
  // If the second step fails, the ballot has extra songs rather than
  // missing ones, and resubmitting fixes it.
  const { error: upsertError } = await db.from("ln_event_songs").upsert(
    orderedIds.map((songId, i) => ({
      event_id: eventId,
      song_id: songId,
      status: "draft",
      sort_order: i,
      proposed_by: user.email,
    })),
    { onConflict: "event_id,song_id" }
  );
  if (upsertError) {
    console.error("propose: ballot upsert failed:", upsertError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { error: pruneError } = await db
    .from("ln_event_songs")
    .delete()
    .eq("event_id", eventId)
    .eq("status", "draft")
    .not("song_id", "in", `(${orderedIds.join(",")})`);
  if (pruneError) {
    console.error("propose: ballot prune failed:", pruneError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, proposed: orderedIds.length });
}
