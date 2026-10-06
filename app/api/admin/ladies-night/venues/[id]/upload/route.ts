// app/api/admin/ladies-night/venues/[id]/upload/route.ts
//
// POST { content_type, size } -> one-time signed upload link for a venue
// logo (PNG or WebP, up to 2 MB). Admin-only. The browser uploads the
// file straight to storage, then saves public_url as the venue's logo.

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { BRAND_BUCKET } from "../../../../../../lib/ln/venues";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "../../../../../../lib/ln/profile-rules";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { content_type?: unknown; size?: unknown } | null;
  const ext = LOGO_TYPES[typeof body?.content_type === "string" ? body.content_type : ""];
  if (!ext) return NextResponse.json({ error: "bad_type", message: "Use a PNG or WebP logo, ideally with a transparent background." }, { status: 400 });
  const size = typeof body?.size === "number" ? body.size : NaN;
  if (!Number.isFinite(size) || size <= 0 || size > LOGO_MAX_BYTES) {
    return NextResponse.json({ error: "too_large", message: "Logos can be up to 2 MB." }, { status: 400 });
  }

  const db = serviceClient();
  const { data: venue, error: venueError } = await db.from("ln_venues").select("id").eq("id", id).maybeSingle();
  if (venueError) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!venue) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const path = `venues/${id}/logo-${randomUUID()}.${ext}`;
  const storage = db.storage.from(BRAND_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error("venue logo upload url failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token, signed_url: data.signedUrl, public_url: storage.getPublicUrl(path).data.publicUrl });
}
