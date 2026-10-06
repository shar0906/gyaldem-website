// app/api/admin/ladies-night/profile/route.ts
//
// Artist-only. The Profile tab.
//
// GET  -> { artist, pending, last_review }
//   artist:      the live, approved profile guests see (approved_at null
//                means it has never been approved and isn't public yet)
//   pending:     the submission waiting for review, if any
//   last_review: the most recent decided submission when it was
//                rejected, so the tab can show the admin's note
//
// POST -> submit changes for review
//   Body: { display_name, bio, instagram_handle, website_url,
//           primary_color, accent_color, photo_url, cover_url, logo_url }
//   Replaces any earlier pending submission. Nothing changes on the
//   ballot page until an admin approves.
//   200 { success: true, pending }
//   400 { error: "invalid", field, message }

import { NextRequest, NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../lib/admin/staff-auth";
import { parseProfile } from "../../../../lib/ln/profile-rules";
import { artistFolderPublicUrl } from "../../../../lib/ln/storage";

export const dynamic = "force-dynamic";

const REVISION_COLUMNS =
  "id, display_name, photo_url, cover_url, logo_url, bio, instagram_handle, website_url, primary_color, accent_color, status, submitted_at, reviewed_at, review_note";

export async function GET() {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const db = serviceClient();

  const [{ data: pending, error: pendingError }, { data: lastDecided, error: decidedError }] = await Promise.all([
    db
      .from("ln_artist_profile_revisions")
      .select(REVISION_COLUMNS)
      .eq("artist_id", auth.artist.id)
      .eq("status", "pending")
      .maybeSingle(),
    db
      .from("ln_artist_profile_revisions")
      .select("status, reviewed_at, review_note")
      .eq("artist_id", auth.artist.id)
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (pendingError || decidedError) {
    console.error("profile lookup failed:", pendingError ?? decidedError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    artist: auth.artist,
    pending: pending ?? null,
    last_review: lastDecided?.status === "rejected" ? lastDecided : null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const parsed = parseProfile(body, artistFolderPublicUrl(auth.artist.id));
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.error }, { status: 400 });
  }

  const db = serviceClient();

  // Only one pending submission per artist: retire the old one first.
  const { error: supersedeError } = await db
    .from("ln_artist_profile_revisions")
    .update({ status: "superseded" })
    .eq("artist_id", auth.artist.id)
    .eq("status", "pending");
  if (supersedeError) {
    console.error("profile supersede failed:", supersedeError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: pending, error: insertError } = await db
    .from("ln_artist_profile_revisions")
    .insert({ ...parsed.value, artist_id: auth.artist.id, submitted_by: auth.user.email })
    .select(REVISION_COLUMNS)
    .single();

  if (insertError) {
    // 23505: a second submission landed at the same instant.
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "try_again" }, { status: 409 });
    }
    console.error("profile submit failed:", insertError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, pending });
}
