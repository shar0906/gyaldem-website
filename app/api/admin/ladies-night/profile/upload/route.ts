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
// itself also rejects anything over 10 MB or of another type, so a
// tampered browser can't get around it.

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireArtist, serviceClient } from "../../../../../lib/admin/staff-auth";
import { COVER_MAX_BYTES, IMAGE_TYPES, PHOTO_MAX_BYTES } from "../../../../../lib/ln/profile-rules";
import { ARTIST_PHOTO_BUCKET } from "../../../../../lib/ln/storage";

export async function POST(req: NextRequest) {
  const auth = await requireArtist();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { kind?: unknown; content_type?: unknown; size?: unknown }
    | null;
  const kind = body?.kind === "photo" || body?.kind === "cover" ? body.kind : null;
  const contentType = typeof body?.content_type === "string" ? body.content_type : "";
  const size = typeof body?.size === "number" ? body.size : NaN;

  if (!kind) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const ext = IMAGE_TYPES[contentType];
  if (!ext) {
    return NextResponse.json({ error: "bad_type", message: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  }
  const max = kind === "photo" ? PHOTO_MAX_BYTES : COVER_MAX_BYTES;
  if (!Number.isFinite(size) || size <= 0 || size > max) {
    return NextResponse.json(
      { error: "too_large", message: `That image is over ${max / 1024 / 1024} MB.` },
      { status: 400 }
    );
  }

  const path = `${auth.artist.id}/${kind}-${randomUUID()}.${ext}`;
  const storage = serviceClient().storage.from(ARTIST_PHOTO_BUCKET);

  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error("signed upload url failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data: pub } = storage.getPublicUrl(path);

  return NextResponse.json({
    path: data.path,
    token: data.token,
    signed_url: data.signedUrl,
    public_url: pub.publicUrl,
  });
}
