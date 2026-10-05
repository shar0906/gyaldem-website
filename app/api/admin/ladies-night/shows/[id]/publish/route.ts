// app/api/admin/ladies-night/shows/[id]/publish/route.ts
//
// POST -> publish the show's ballot. Admin-only.
// Requires: an assigned, approved, active artist; at least 10 draft
// songs; the show not archived or past. Publishes every draft and puts
// the show live on the site's Events page.
//
//   200 { success: true, published, event_published }
//   400 not_enough_songs { have, need } | no_artist | artist_not_approved | show_closed
//   404 not_found

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { todayEastern } from "../../../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

const MIN_SONGS_TO_PUBLISH = 10;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const db = serviceClient();

  const { data: show, error } = await db
    .from("ln_events")
    .select("id, artist_id, archived, event_date, public_event_id, ln_artists(approved_at, active)")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      artist_id: string | null;
      archived: boolean;
      event_date: string;
      public_event_id: string | null;
      ln_artists: { approved_at: string | null; active: boolean } | null;
    }>();
  if (error) {
    console.error("publish: show lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!show) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (show.archived || show.event_date < todayEastern()) {
    return NextResponse.json({ error: "show_closed" }, { status: 400 });
  }
  if (!show.artist_id || !show.ln_artists) return NextResponse.json({ error: "no_artist" }, { status: 400 });
  if (!show.ln_artists.approved_at || !show.ln_artists.active) {
    return NextResponse.json({ error: "artist_not_approved" }, { status: 400 });
  }

  const { count, error: countError } = await db
    .from("ln_event_songs")
    .select("song_id", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("status", "draft");
  if (countError) {
    console.error("publish: draft count failed:", countError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const drafts = count ?? 0;
  if (drafts < MIN_SONGS_TO_PUBLISH) {
    return NextResponse.json({ error: "not_enough_songs", have: drafts, need: MIN_SONGS_TO_PUBLISH }, { status: 400 });
  }

  const { error: publishError } = await db
    .from("ln_event_songs")
    .update({ status: "published", published_by: user.email, published_at: new Date().toISOString() })
    .eq("event_id", id)
    .eq("status", "draft");
  if (publishError) {
    console.error("publish failed:", publishError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Put the show on the public Events page (draft -> upcoming only).
  let eventPublished = false;
  if (show.public_event_id) {
    const { data: flipped, error: flipError } = await db
      .from("events")
      .update({ status: "upcoming" })
      .eq("id", show.public_event_id)
      .eq("status", "draft")
      .select("id");
    if (flipError) console.error("events page flip failed (ballot is still published):", flipError);
    eventPublished = (flipped?.length ?? 0) > 0;
  }

  return NextResponse.json({ success: true, published: drafts, event_published: eventPublished });
}
