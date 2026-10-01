// app/api/admin/ladies-night/repertoire/route.ts
//
// DELETE /api/admin/ladies-night/repertoire
// Body: { song_id: string }
// Staff-only, scoped to your own repertoire (added_by = you) — can't
// delete someone else's entries.
//
// Built and working, but the CLIENT-SIDE call to this is deliberately
// commented out in ArtistPropose.tsx for now, pending confirmation this
// is actually wanted. This route itself is harmless sitting unused.
//
// Worth knowing before ever enabling the client trigger: ln_repertoire
// has ON DELETE RESTRICT from ln_event_songs, so the database itself
// will refuse to delete a song that's been used on ANY event's ballot,
// past or present — that comes back as a Postgres foreign-key error
// (code 23503), not a generic 500. Handle that specifically once this
// is wired up, with a message like "can't delete — this song's been
// used before" rather than a raw server error.
//
// Untested draft — not run inside your repo yet.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export async function DELETE(req: NextRequest) {
  const user = await requireStaffUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { song_id } = await req.json();
  if (!song_id) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { error } = await serviceClient()
    .from("ln_repertoire")
    .delete()
    .eq("id", song_id)
    .eq("added_by", user.email);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json({ error: "song_in_use" }, { status: 409 });
    }
    console.error("repertoire delete failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}