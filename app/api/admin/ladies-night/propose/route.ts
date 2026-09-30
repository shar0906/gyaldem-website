// app/api/admin/ladies-night/propose/route.ts
//
// POST /api/admin/ladies-night/propose
// Body: { event_id: string, songs: Array<{
//   title: string, artist: string, category: string | null,
//   artwork_url: string | null, apple_track_id: number | null,
//   apple_music_url: string | null
// }> }
//
// Staff-only (admin or artist). Requires at least 10 songs in THIS
// submission — mirrors the same 10-song minimum on the publish side.
// Sending fewer is rejected outright, both here and (implicitly) on
// the client, which should disable Submit until 10 are selected.
//
// For each song: if it has an apple_track_id, upsert into ln_repertoire
// keyed on that (so searching the same song twice across proposals
// reuses one repertoire row instead of creating duplicates). Manually
// entered songs (no apple_track_id — jazz standards, etc.) always
// insert fresh, since there's no reliable natural key to dedupe on.
// Then every song gets drafted onto this event's ballot, attributed to
// whoever's submitting.
//
// Untested draft — not run inside your repo yet.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

const MIN_SONGS_TO_PROPOSE = 10;

type IncomingSong = {
  title: string;
  artist: string;
  category: string | null;
  artwork_url: string | null;
  apple_track_id: number | null;
  apple_music_url: string | null;
};

export async function POST(req: NextRequest) {
  const user = await requireStaffUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { event_id, songs } = (await req.json()) as { event_id?: string; songs?: IncomingSong[] };

  if (!event_id || !Array.isArray(songs)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (songs.length < MIN_SONGS_TO_PROPOSE) {
    return NextResponse.json(
      { error: "not_enough_songs", have: songs.length, need: MIN_SONGS_TO_PROPOSE },
      { status: 400 }
    );
  }

  const admin = serviceClient();

  const appleSongs = songs.filter((s) => s.apple_track_id != null);
  const manualSongs = songs.filter((s) => s.apple_track_id == null);

  const repertoireIds: string[] = [];

  if (appleSongs.length > 0) {
    const { data, error } = await admin
      .from("ln_repertoire")
      .upsert(
        appleSongs.map((s) => ({
          title: s.title,
          artist: s.artist,
          category: s.category,
          artwork_url: s.artwork_url,
          apple_track_id: s.apple_track_id,
          apple_music_url: s.apple_music_url,
          source: "itunes",
          added_by: user.email,
        })),
        { onConflict: "apple_track_id" }
      )
      .select("id");

    if (error) {
      console.error("repertoire upsert (itunes) failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    repertoireIds.push(...(data ?? []).map((r) => r.id));
  }

  if (manualSongs.length > 0) {
    const { data, error } = await admin
      .from("ln_repertoire")
      .insert(
        manualSongs.map((s) => ({
          title: s.title,
          artist: s.artist,
          category: s.category,
          artwork_url: s.artwork_url,
          source: "manual",
          added_by: user.email,
        }))
      )
      .select("id");

    if (error) {
      console.error("repertoire insert (manual) failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    repertoireIds.push(...(data ?? []).map((r) => r.id));
  }

  const { error: draftError } = await admin
    .from("ln_event_songs")
    .upsert(
      repertoireIds.map((songId, i) => ({
        event_id,
        song_id: songId,
        status: "draft",
        proposed_by: user.email,
        sort_order: i,
      })),
      { onConflict: "event_id,song_id", ignoreDuplicates: true }
    );

  if (draftError) {
    console.error("draft insert failed:", draftError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, proposed: repertoireIds.length });
}