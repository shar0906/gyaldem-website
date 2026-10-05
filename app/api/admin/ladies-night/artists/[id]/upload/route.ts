// app/api/admin/ladies-night/artists/[id]/upload/route.ts
//
// POST -> signed upload link into an artist's photo folder, for admins
// editing an artist directly. Same body, limits, and response as the
// artist's own Profile upload route.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { createArtistUpload } from "../../../../../../lib/ln/uploads";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const { data: artist, error } = await serviceClient().from("ln_artists").select("id").eq("id", id).maybeSingle();
  if (error) {
    console.error("artist lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!artist) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await createArtistUpload(id, await req.json().catch(() => null));
  if (!result.ok) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }
  return NextResponse.json({
    path: result.path,
    token: result.token,
    signed_url: result.signed_url,
    public_url: result.public_url,
  });
}
