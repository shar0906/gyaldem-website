// app/api/admin/ladies-night/clients/[id]/upload/route.ts
//
// POST { content_type, size } -> one-time signed upload link for a
// client's logo (PNG or WebP with a transparent background, up to 2 MB).
// Admin-only. The browser uploads, then saves public_url as logo_url.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { createBrandUpload } from "../../../../../../lib/ln/brand-upload";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { content_type?: unknown; size?: unknown } | null;
  const { data, error } = await serviceClient().from("ln_clients").select("id").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const result = await createBrandUpload("clients", id, "logo", body?.content_type, body?.size);
  if (!result.ok) return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  const { ok: _ok, ...rest } = result;
  return NextResponse.json(rest);
}
