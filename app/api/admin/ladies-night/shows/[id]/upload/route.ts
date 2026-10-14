// app/api/admin/ladies-night/shows/[id]/upload/route.ts
//
// POST { content_type, size } -> a one-time signed upload link for this
// show's cover photo (JPG, PNG, or WebP, up to 10 MB). Admin-only. The
// browser uploads the file, then saves public_url on the show as
// cover_url. The sign-in page uses it ahead of the series' cover.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { createBrandUpload } from "../../../../../../lib/ln/brand-upload";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { content_type?: unknown; size?: unknown } | null;

  const { data, error } = await serviceClient().from("ln_events").select("id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await createBrandUpload("shows", id, "cover", body?.content_type, body?.size);
  if (!result.ok) return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  const { ok: _ok, ...rest } = result;
  return NextResponse.json(rest);
}
