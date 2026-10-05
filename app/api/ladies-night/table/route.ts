// app/api/ladies-night/table/route.ts
//
// POST /api/ladies-night/table
// Public, remembered guests only. "I've reserved my table": records it
// on their RSVP so the page shows "Still need your table?" instead of the
// full OpenTable step. Honor system; safe to send twice.
//
//   200 { guest }
//   401 not_signed_in
//   409 rsvp_required

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { readGuestId } from "../../../lib/ln/guest-session";
import { guestState } from "../../../lib/ln/guests";
import { getCurrentShow } from "../../../lib/ln/public-show";
import { limited, tooMany } from "../../../lib/ln/public-guard";

export async function POST(req: NextRequest) {
  if (limited(req, "table", 10)) return tooMany();
  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });

    const { data: updated, error } = await db
      .from("ln_rsvps")
      .update({ table_reserved_at: new Date().toISOString(), table_reserved_source: "self_reported" })
      .eq("event_id", show.id)
      .eq("voter_id", voterId)
      .is("table_reserved_at", null)
      .select("id");
    if (error) throw error;

    if (!updated?.length) {
      const { data: rsvp } = await db.from("ln_rsvps").select("id").eq("event_id", show.id).eq("voter_id", voterId).maybeSingle();
      if (!rsvp) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });
    }

    return NextResponse.json({ guest: await guestState(db, voterId, show.id) });
  } catch (error) {
    console.error("table reserved failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
