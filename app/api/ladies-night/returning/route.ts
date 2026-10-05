// app/api/ladies-night/returning/route.ts
//
// POST /api/ladies-night/returning
// Body: { email, door?: string }
// Public. "Already RSVP'd?": looks the guest up by email for the current
// show. Found: remembers this device and returns their state (and checks
// them in when it comes through the door QR). Not found: the page opens
// the full form with the email filled in.
//
//   200 { guest }
//   404 not_found
//   409 rsvp_closed
//   429 too_many_requests

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { ensureRsvp, guestState, parseEmail } from "../../../lib/ln/guests";
import { setGuestCookie } from "../../../lib/ln/guest-session";
import { limited, loadOpenShow, tooMany } from "../../../lib/ln/public-guard";

export async function POST(req: NextRequest) {
  // Tighter than the gate: this one answers "is this email on the list?"
  if (limited(req, "returning", 6)) return tooMany();

  const body = (await req.json().catch(() => null)) as { email?: unknown; door?: unknown } | null;
  const email = parseEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid", field: "email", message: "Check your email address." }, { status: 400 });
  }

  const db = serviceClient();
  try {
    const open = await loadOpenShow(db, body?.door);
    if (!open.ok) return open.response;
    const { show, door } = open.value;

    const { data: voter, error } = await db.from("ln_voters").select("id").eq("email", email).maybeSingle();
    if (error) throw error;

    let found = false;
    if (voter) {
      const { data: rsvp, error: rsvpError } = await db
        .from("ln_rsvps")
        .select("id")
        .eq("event_id", show.id)
        .eq("voter_id", voter.id)
        .maybeSingle();
      if (rsvpError) throw rsvpError;
      found = !!rsvp;
    }
    if (!voter || !found) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (door) await ensureRsvp(db, { showId: show.id, voterId: voter.id, source: "door_qr", checkIn: { by: "door_qr" } });

    const res = NextResponse.json({ guest: await guestState(db, voter.id, show.id) });
    if (!setGuestCookie(res, voter.id)) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return res;
  } catch (error) {
    console.error("returning lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
