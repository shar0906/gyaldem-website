// app/api/ladies-night/table/route.ts
//
// POST /api/ladies-night/table
// Public, remembered guests only. Records that the guest has a table.
//
//   {}                                   "I've reserved my table" (honor system)
//   { source: "opentable", confirmation_number, party_size,
//     reservation_datetime }             the booking OpenTable reported to the
//                                        page when the guest booked inline
//
// OpenTable details are saved for the Guests list, exports, and the door.
// Safe to send more than once; OpenTable details replace a plain tap.
//
//   200 { guest }
//   400 invalid
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

  const body = (await req.json().catch(() => ({}))) as {
    source?: unknown;
    confirmation_number?: unknown;
    party_size?: unknown;
    reservation_datetime?: unknown;
  };

  let details: Record<string, unknown> = { table_reserved_source: "self_reported" };
  if (body.source === "opentable") {
    const conf = typeof body.confirmation_number === "number" || typeof body.confirmation_number === "string" ? String(body.confirmation_number) : "";
    const party = typeof body.party_size === "number" ? body.party_size : NaN;
    const when = typeof body.reservation_datetime === "string" ? body.reservation_datetime : "";
    if (!/^[A-Za-z0-9-]{1,40}$/.test(conf) || !Number.isInteger(party) || party < 1 || party > 50 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    details = {
      table_reserved_source: "opentable",
      table_confirmation: conf,
      table_party_size: party,
      table_reserved_for: when.slice(0, 16),
    };
  }

  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });

    const { data: rsvp, error: findError } = await db
      .from("ln_rsvps")
      .select("id, table_reserved_at")
      .eq("event_id", show.id)
      .eq("voter_id", voterId)
      .maybeSingle();
    if (findError) throw findError;
    if (!rsvp) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });

    // A plain tap never overwrites real OpenTable details.
    if (body.source === "opentable" || !rsvp.table_reserved_at) {
      const { error } = await db
        .from("ln_rsvps")
        .update({ table_reserved_at: rsvp.table_reserved_at ?? new Date().toISOString(), ...details })
        .eq("id", rsvp.id);
      if (error) throw error;
    }

    return NextResponse.json({ guest: await guestState(db, voterId, show.id) });
  } catch (error) {
    console.error("table reserved failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
