// app/api/admin/ladies-night/publish/route.ts
//
// POST /api/admin/ladies-night/publish
// Body: { event_id: string }
//
// Publishes the ENTIRE current batch of draft songs for an event at
// once — not one song at a time. Requires at least 10 drafts; anything
// less is rejected, matching the same 10-song minimum Kay's propose
// screen will enforce on her side.
//
// This is also what takes the event live: publishing the ballot flips
// the linked events row from 'draft' to 'upcoming' in the same call.
// 'past' events are never touched, even if someone publishes against
// an old event_id after the fact.
//
// Admin-only.
//
// Untested draft — not run inside your repo yet.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

const MIN_SONGS_TO_PUBLISH = 10;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { event_id } = await req.json();
  if (!event_id) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = serviceClient();

  const { data: drafts, error: draftsError } = await admin
    .from("ln_event_songs")
    .select("song_id")
    .eq("event_id", event_id)
    .eq("status", "draft");

  if (draftsError) {
    console.error("draft lookup failed:", draftsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const draftCount = drafts?.length ?? 0;
  if (draftCount < MIN_SONGS_TO_PUBLISH) {
    return NextResponse.json(
      { error: "not_enough_songs", have: draftCount, need: MIN_SONGS_TO_PUBLISH },
      { status: 400 }
    );
  }

  const { error: publishError } = await admin
    .from("ln_event_songs")
    .update({
      status: "published",
      published_by: user.email,
      published_at: new Date().toISOString(),
    })
    .eq("event_id", event_id)
    .eq("status", "draft");

  if (publishError) {
    console.error("bulk publish failed:", publishError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Flip the linked public event live, same as before — draft -> upcoming
  // only, never touching an already-upcoming or past event.
  const { data: eventRow, error: eventLookupError } = await admin
    .from("ln_events")
    .select("public_event_id")
    .eq("id", event_id)
    .maybeSingle();

  if (eventLookupError || !eventRow?.public_event_id) {
    if (eventLookupError) console.error("event lookup failed (songs still published):", eventLookupError);
    return NextResponse.json({ success: true, published: draftCount, event_published: false });
  }

  const { error: eventUpdateError, data: eventUpdateData } = await admin
    .from("events")
    .update({ status: "upcoming" })
    .eq("id", eventRow.public_event_id)
    .eq("status", "draft")
    .select("id");

  if (eventUpdateError) {
    console.error("event status flip failed (songs still published):", eventUpdateError);
  }

  return NextResponse.json({
    success: true,
    published: draftCount,
    event_published: (eventUpdateData?.length ?? 0) > 0,
  });
}