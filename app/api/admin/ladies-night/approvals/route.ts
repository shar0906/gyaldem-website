// app/api/admin/ladies-night/approvals/route.ts
//
// GET -> { pending: [...] }  Admin-only.
// Every profile submission waiting for review, oldest first, each paired
// with the artist's current live profile so the screen can show exactly
// what would change.

import { NextResponse } from "next/server";
import { ARTIST_COLUMNS, requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { data, error } = await serviceClient()
    .from("ln_artist_profile_revisions")
    .select(
      "id, artist_id, display_name, photo_url, cover_url, logo_url, bio, instagram_handle, website_url, primary_color, accent_color, " +
        `submitted_by, submitted_at, live:ln_artists(${ARTIST_COLUMNS})`
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("approvals list failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ pending: data ?? [] });
}
