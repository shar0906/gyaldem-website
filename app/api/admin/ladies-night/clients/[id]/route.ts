// app/api/admin/ladies-night/clients/[id]/route.ts
//
// PATCH -> edit a client (name, instagram_handle, website_url,
// contact_email, logo_url, active). Admin-only.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { CLIENT_COLUMNS, ClientRow, parseClientPatch } from "../../../../../lib/ln/series";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const parsed = parseClientPatch(body, id);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });
  const { data, error } = await serviceClient()
    .from("ln_clients")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(CLIENT_COLUMNS)
    .maybeSingle<ClientRow>();
  if (error) {
    console.error("client update failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ success: true, client: data });
}
