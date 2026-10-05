// app/api/admin/ladies-night/repertoire/route.ts
//
// DELETE /api/admin/ladies-night/repertoire
// Body: { song_id: string }
// Artist-only. Removes a song from the signed-in artist's own library.
// The song itself stays in the shared catalog, so past ballots, votes,
// and other artists' libraries are never affected.
//
// The delete button in ArtistPropose stays switched off until Kay
// decides she wants it. This route is safe either way.

import { NextRequest, NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../lib/admin/staff-auth";

export async function DELETE(req: NextRequest) {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { song_id?: unknown } | null;
  const songId = typeof body?.song_id === "string" ? body.song_id : null;
  if (!songId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { error } = await serviceClient()
    .from("ln_artist_library")
    .delete()
    .eq("artist_id", auth.artist.id)
    .eq("song_id", songId);

  if (error) {
    console.error("library delete failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
