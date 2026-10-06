// app/api/admin/ladies-night/venues/[id]/route.ts
//
// PATCH -> edit a venue (any subset of name, address, logo_url,
// website_url, instagram_handle, opentable_widget, active). Admin-only.
// Changes show up on the public page right away. Shows linked to this
// venue get their Events-page location updated too.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { VENUE_COLUMNS, VenueRow, parseVenuePatch } from "../../../../../lib/ln/venues";
import { SHOW_COLUMNS, ShowRow, syncPublicEvent } from "../../../../../lib/ln/shows";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const parsed = parseVenuePatch(body, id);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });

  const db = serviceClient();
  const { data: venue, error } = await db
    .from("ln_venues")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(VENUE_COLUMNS)
    .maybeSingle<VenueRow>();
  if (error) {
    console.error("venue update failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!venue) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if ("name" in parsed.value || "address" in parsed.value) {
    const { data: shows } = await db.from("ln_events").select(SHOW_COLUMNS).eq("venue_id", id).returns<ShowRow[]>();
    for (const s of shows ?? []) await syncPublicEvent(db, s);
  }
  return NextResponse.json({ success: true, venue });
}
