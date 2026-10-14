// app/api/admin/ladies-night/event-link/route.ts
//
// The link between an Events page entry and its Ladies Night show, used by
// the Events form so edits there reach the show (and the guest pages).
// Admin-only.
//
// GET  ?event_id=<id> -> { show: { id, series_name } | null }
// POST { event_id }   -> copies the entry's name and description onto the
//   show's title and sign-in page description. The flyer needs no copy:
//   the show reads it from the entry. Date, venue, and RSVP link stay the
//   show's to set (Shows overwrites them on the entry).
//   200 { success: true, show_id | null, trimmed?: true }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 600;

async function linkedShow(eventId: string) {
  const db = serviceClient();
  const { data, error } = await db
    .from("ln_events")
    .select("id, ln_series(name)")
    .eq("public_event_id", eventId)
    .maybeSingle<{ id: string; ln_series: { name: string } | null }>();
  if (error) throw error;
  return data;
}

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const eventId = req.nextUrl.searchParams.get("event_id") ?? "";
  if (!UUID.test(eventId)) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  try {
    const show = await linkedShow(eventId);
    return NextResponse.json({ show: show ? { id: show.id, series_name: show.ln_series?.name ?? null } : null });
  } catch (error) {
    console.error("event link lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { event_id?: unknown } | null;
  const eventId = typeof body?.event_id === "string" ? body.event_id : "";
  if (!UUID.test(eventId)) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  try {
    const show = await linkedShow(eventId);
    if (!show) return NextResponse.json({ success: true, show_id: null });
    const { data: entry, error } = await db.from("events").select("name, description").eq("id", eventId).maybeSingle<{ name: string | null; description: string | null }>();
    if (error) throw error;
    if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const name = (entry.name ?? "").trim();
    const description = (entry.description ?? "").trim();
    const trimmed = name.length > TITLE_MAX || description.length > DESCRIPTION_MAX;
    const update: Record<string, string | null> = { gate_description: description ? description.slice(0, DESCRIPTION_MAX) : null };
    if (name) update.title = name.slice(0, TITLE_MAX);
    const { error: updateError } = await db.from("ln_events").update(update).eq("id", show.id);
    if (updateError) throw updateError;
    return NextResponse.json({ success: true, show_id: show.id, ...(trimmed && { trimmed: true }) });
  } catch (error) {
    console.error("event link sync failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
