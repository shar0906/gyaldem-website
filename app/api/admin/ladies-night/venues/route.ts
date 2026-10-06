// app/api/admin/ladies-night/venues/route.ts
//
// Admin-only. Restaurants that host Ladies Night.
// GET  -> { venues }  active first, then by name, each with upcoming show count
// POST -> create { name, address?, website_url?, instagram_handle?, opentable_widget? }
//   (upload the logo after creating, from the venue's own upload route)

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { VENUE_COLUMNS, VenueRow, parseVenuePatch } from "../../../../lib/ln/venues";
import { todayEastern } from "../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = serviceClient();
  const [venuesRes, showsRes] = await Promise.all([
    db.from("ln_venues").select(VENUE_COLUMNS).returns<VenueRow[]>(),
    db.from("ln_events").select("venue_id").eq("archived", false).gte("event_date", todayEastern()),
  ]);
  if (venuesRes.error || showsRes.error) {
    console.error("venues list failed:", venuesRes.error ?? showsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const upcoming = new Map<string, number>();
  for (const s of showsRes.data ?? []) if (s.venue_id) upcoming.set(s.venue_id, (upcoming.get(s.venue_id) ?? 0) + 1);
  const venues = (venuesRes.data ?? [])
    .map((v) => ({ ...v, upcoming_shows: upcoming.get(v.id) ?? 0 }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  return NextResponse.json({ venues });
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const { logo_url: _ignored, ...rest } = body;
  const parsed = parseVenuePatch(rest, null);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });
  if (!parsed.value.name) return NextResponse.json({ error: "invalid", field: "name", message: "Add the venue's name." }, { status: 400 });

  const { data, error } = await serviceClient().from("ln_venues").insert(parsed.value).select(VENUE_COLUMNS).single();
  if (error) {
    console.error("venue create failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true, venue: data });
}
