// app/api/admin/ladies-night/profile/upload/route.ts
//
// POST /api/admin/ladies-night/profile/upload
// Body: { kind: "photo" | "cover", content_type: string, size: number }
// Artist-only. Returns a one-time signed upload link into the artist's
// own folder. The browser uploads the file straight to Supabase Storage
// (it never passes through this server), then includes public_url in the
// profile submission.
//
//   200 { path, token, signed_url, public_url }
//   400 bad_type | too_large
//
// Limits: profile photo 5 MB, cover 10 MB; JPG, PNG, or WebP. The bucket
// itself also rejects anything over 10 MB or of another type.

import { NextRequest, NextResponse } from "next/server";
import { requireArtist } from "../../../../../lib/admin/staff-auth";
import { createArtistUpload } from "../../../../../lib/ln/uploads";

export async function POST(req: NextRequest) {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const result = await createArtistUpload(auth.artist.id, await req.json().catch(() => null));
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
