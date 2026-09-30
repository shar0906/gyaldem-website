// app/api/admin/ladies-night/my-event/route.ts
//
// GET /api/admin/ladies-night/my-event
// Staff-only. Returns the latest non-archived event (same "one being
// actively prepped" event the admin tab shows) plus whichever songs
// THIS signed-in person has already proposed for it — so Kay sees her
// own running list, not everyone's.
//
// Untested draft — not run inside your repo yet.

import { NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const admin = serviceClient();

  const { data: event, error: eventError } = await admin
    .from("ln_events")
    .select("id, title, event_date")
    .eq("archived", false)
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("event lookup failed:", eventError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!event) {
    return NextResponse.json({ event: null, mySongs: [] });
  }

  const { data: mySongs, error: songsError } = await admin
    .from("ln_event_songs")
    .select("song_id, status, ln_repertoire(title, artist, category, artwork_url)")
    .eq("event_id", event.id)
    .eq("proposed_by", user.email)
    .order("sort_order", { ascending: true });

  if (songsError) {
    console.error("my-songs lookup failed:", songsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ event, mySongs: mySongs ?? [] });
}