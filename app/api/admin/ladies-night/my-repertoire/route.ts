// app/api/admin/ladies-night/my-repertoire/route.ts
//
// GET /api/admin/ladies-night/my-repertoire
// Artist-only. The signed-in artist's song library: every song they've
// added, across all shows. Two artists can have the same song; each
// keeps their own copy in their library.

import { NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

type LibraryRow = {
  added_at: string;
  ln_repertoire: {
    id: string;
    title: string;
    artist: string;
    artwork_url: string | null;
    apple_track_id: number | null;
    apple_music_url: string | null;
  } | null;
};

export async function GET() {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { data, error } = await serviceClient()
    .from("ln_artist_library")
    .select("added_at, ln_repertoire(id, title, artist, artwork_url, apple_track_id, apple_music_url)")
    .eq("artist_id", auth.artist.id)
    .returns<LibraryRow[]>();

  if (error) {
    console.error("library lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const repertoire = (data ?? [])
    .map((row) => row.ln_repertoire)
    .filter((song): song is NonNullable<LibraryRow["ln_repertoire"]> => song !== null)
    .sort((a, b) => a.title.localeCompare(b.title));

  return NextResponse.json({ repertoire });
}
