// app/api/admin/ladies-night/artists/route.ts
//
// GET -> { artists: [...] }  Admin-only.
// Every artist with their live profile, whether changes are waiting for
// review, and how many upcoming shows they're booked on. Active artists
// first, then alphabetical.

import { NextResponse } from "next/server";
import { ARTIST_COLUMNS, ArtistRow, requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { todayEastern } from "../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const db = serviceClient();

  const [artistsRes, pendingRes, showsRes] = await Promise.all([
    db.from("ln_artists").select(ARTIST_COLUMNS).returns<ArtistRow[]>(),
    db.from("ln_artist_profile_revisions").select("artist_id").eq("status", "pending"),
    db.from("ln_events").select("artist_id").eq("archived", false).gte("event_date", todayEastern()).not("artist_id", "is", null),
  ]);
  if (artistsRes.error || pendingRes.error || showsRes.error) {
    console.error("artists list failed:", artistsRes.error ?? pendingRes.error ?? showsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const pending = new Set((pendingRes.data ?? []).map((r) => r.artist_id as string));
  const booked = new Map<string, number>();
  for (const row of showsRes.data ?? []) {
    booked.set(row.artist_id as string, (booked.get(row.artist_id as string) ?? 0) + 1);
  }

  const artists = (artistsRes.data ?? [])
    .map((a) => ({ ...a, has_pending_changes: pending.has(a.id), upcoming_shows: booked.get(a.id) ?? 0 }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.display_name.localeCompare(b.display_name));

  return NextResponse.json({ artists });
}
