// app/api/admin/ladies-night/my-repertoire/route.ts
//
// GET /api/admin/ladies-night/my-repertoire
// Staff-only. Returns every ln_repertoire row THIS person has ever
// added, across all events — this is the artist's personal reusable
// song library, not scoped to any single proposal.
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

  const { data, error } = await serviceClient()
    .from("ln_repertoire")
    .select("id, title, artist, category, artwork_url, apple_track_id")
    .eq("added_by", user.email)
    .order("title", { ascending: true });

  if (error) {
    console.error("my-repertoire lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ repertoire: data ?? [] });
}