// app/api/admin/ladies-night/shows/[id]/copy-forward/route.ts
//
// POST -> fill this show's draft ballot from the assigned artist's most
// recent earlier show, skipping songs they've since removed from their
// library. Admin-only. Existing drafts are kept.
//
//   200 { success: true, copied }   copied is 0 when there's no earlier show
//   400 no_artist
//   404 not_found

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const { data, error } = await serviceClient().rpc("ln_copy_ballot_for_artist", { p_to: id });
  if (error) {
    if (error.message?.includes("event_not_found")) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error.message?.includes("no_artist_assigned")) return NextResponse.json({ error: "no_artist" }, { status: 400 });
    console.error("copy forward failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true, copied: data ?? 0 });
}
