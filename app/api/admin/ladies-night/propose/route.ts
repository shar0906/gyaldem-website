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

const MIN_SONGS_TO_PROPOSE = 10;
const MAX_SONGS_TO_PROPOSE = 60;
const TEXT_MAX = 200;

type CleanSong = {
  repertoire_id: string | null;
  title: string;
  artist: string;
  artwork_url: string | null;
  apple_track_id: number | null;
  apple_music_url: string | null;
};

function cleanUrl(v: unknown): string | null {
  return typeof v === "string" && v.startsWith("https://") && v.length <= 1000 ? v : null;
}

function cleanSong(raw: unknown): CleanSong | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const title = typeof s.title === "string" ? s.title.trim() : "";
  const artist = typeof s.artist === "string" ? s.artist.trim() : "";
  if (!title || !artist || title.length > TEXT_MAX || artist.length > TEXT_MAX) return null;
  const trackId =
    typeof s.apple_track_id === "number" && Number.isSafeInteger(s.apple_track_id) && s.apple_track_id > 0
      ? s.apple_track_id
      : null;
  return {
    repertoire_id: typeof s.repertoire_id === "string" && s.repertoire_id ? s.repertoire_id : null,
    title,
    artist,
    artwork_url: cleanUrl(s.artwork_url),
    apple_track_id: trackId,
    apple_music_url: cleanUrl(s.apple_music_url),
  };
}

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

  // 1. Library songs must actually be in this artist's library.
  const libraryIds = [...new Set(songs.flatMap((s) => (s.repertoire_id ? [s.repertoire_id] : [])))];
  if (libraryIds.length) {
    const { data: owned, error } = await db
      .from("ln_artist_library")
      .select("song_id")
      .eq("artist_id", artist.id)
      .in("song_id", libraryIds);
    if (error) {
      console.error("propose: library check failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    const ownedSet = new Set((owned ?? []).map((r) => r.song_id as string));
    if (libraryIds.some((id) => !ownedSet.has(id))) {
      return NextResponse.json({ error: "unknown_song" }, { status: 400 });
    }
  }

  // 2. Apple songs: reuse existing catalog rows, add only the missing ones.
  const trackIds = [
    ...new Set(songs.flatMap((s) => (!s.repertoire_id && s.apple_track_id ? [s.apple_track_id] : []))),
  ];
  const idByTrack = new Map<number, string>();
  if (trackIds.length) {
    const lookup = async () => {
      const { data, error } = await db
        .from("ln_repertoire")
        .select("id, apple_track_id")
        .in("apple_track_id", trackIds);
      if (error) throw error;
      for (const row of data ?? []) idByTrack.set(Number(row.apple_track_id), row.id as string);
    };
    try {
      await lookup();
      const missing = songs.filter(
        (s) => !s.repertoire_id && s.apple_track_id && !idByTrack.has(s.apple_track_id)
      );
      const seen = new Set<number>();
      const toInsert = missing
        .filter((s) => (seen.has(s.apple_track_id!) ? false : (seen.add(s.apple_track_id!), true)))
        .map((s) => ({
          title: s.title,
          artist: s.artist,
          artwork_url: s.artwork_url,
          apple_track_id: s.apple_track_id,
          apple_music_url: s.apple_music_url,
          source: "itunes",
        }));
      if (toInsert.length) {
        // ignoreDuplicates covers a race with another artist adding the
        // same track at the same moment; the lookup below picks it up.
        const { error } = await db
          .from("ln_repertoire")
          .upsert(toInsert, { onConflict: "apple_track_id", ignoreDuplicates: true });
        if (error) throw error;
        await lookup();
      }
    } catch (error) {
      console.error("propose: catalog upsert failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // 3. Manual songs: always new catalog rows.
  const manual = songs.filter((s) => !s.repertoire_id && !s.apple_track_id);
  const manualIds: string[] = [];
  if (manual.length) {
    const { data, error } = await db
      .from("ln_repertoire")
      .insert(manual.map((s) => ({ title: s.title, artist: s.artist, artwork_url: s.artwork_url, source: "manual" })))
      .select("id");
    if (error) {
      console.error("propose: manual insert failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    manualIds.push(...(data ?? []).map((r) => r.id as string));
  }

  // Resolve every song to an id in the order the artist submitted them,
  // dropping repeats.
  let manualIndex = 0;
  const orderedIds: string[] = [];
  for (const s of songs) {
    const id = s.repertoire_id ?? (s.apple_track_id ? idByTrack.get(s.apple_track_id) : manualIds[manualIndex++]);
    if (id && !orderedIds.includes(id)) orderedIds.push(id);
  }

  if (orderedIds.length < MIN_SONGS_TO_PROPOSE) {
    return NextResponse.json(
      { error: "not_enough_songs", have: orderedIds.length, need: MIN_SONGS_TO_PROPOSE },
      { status: 400 }
    );
  }

  // Everything proposed lands in the artist's library.
  const { error: libraryError } = await db
    .from("ln_artist_library")
    .upsert(
      orderedIds.map((songId) => ({ artist_id: artist.id, song_id: songId })),
      { onConflict: "artist_id,song_id", ignoreDuplicates: true }
    );
  if (libraryError) {
    console.error("propose: library upsert failed:", libraryError);
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
