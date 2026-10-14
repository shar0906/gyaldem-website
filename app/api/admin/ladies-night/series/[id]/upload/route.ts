// app/api/admin/ladies-night/series/[id]/upload/route.ts
//
// POST { kind: "title" | "presents" | "cover", content_type, size }
//   -> one-time signed upload link. Admin-only.
//   title, presents: PNG or WebP with a transparent background, up to 2 MB
//   cover: JPG, PNG, or WebP, up to 10 MB
// The browser uploads the file, then saves public_url on the series.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { createBrandUpload } from "../../../../../../lib/ln/brand-upload";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { kind?: unknown; content_type?: unknown; size?: unknown } | null;
  const kind = body?.kind === "title" || body?.kind === "presents" || body?.kind === "cover" ? body.kind : null;
  if (!kind) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const { data, error } = await serviceClient().from("ln_series").select("id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await createBrandUpload("series", id, kind, body?.content_type, body?.size);
  if (!result.ok) return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  const { ok: _ok, ...rest } = result;
  return NextResponse.json(rest);
}
