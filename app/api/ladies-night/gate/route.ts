// app/api/ladies-night/gate/route.ts
//
// POST /api/ladies-night/gate
// Body: { first_name, last_name, email, consent: true,
//         share_with_artist?: boolean, door?: string }
// Public. The gate's "Let Me In". Pressing it is the guest's consent
// (the consent line sits under the button), so consent must be true.
// RSVPs them, queues them for Kit, remembers this device, and returns
// their state. Through the door QR on show night it also checks them in.
//
//   200 { guest }
//   400 { error: "invalid", field, message } | consent_required
//   409 rsvp_closed
//   429 too_many_requests
//   503 not_configured (LN_GUEST_SECRET missing)

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { guestState, parseGuest, upsertGuestRsvp } from "../../../lib/ln/guests";
import { setGuestCookie } from "../../../lib/ln/guest-session";
import { limited, loadOpenShow, tooMany } from "../../../lib/ln/public-guard";

export async function POST(req: NextRequest) {
  if (limited(req, "gate", 10)) return tooMany();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "consent_required" }, { status: 400 });

  const parsed = parseGuest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });
  }

  const db = serviceClient();
  try {
    const open = await loadOpenShow(db, body.door);
    if (!open.ok) return open.response;
    const { show, door } = open.value;

    const { voterId } = await upsertGuestRsvp(db, {
      showId: show.id,
      guest: parsed.value,
      source: door ? "door_qr" : "gate",
      shareWithArtist: body.share_with_artist === true,
      checkIn: door ? { by: "door_qr" } : null,
    });

    const res = NextResponse.json({ guest: await guestState(db, voterId, show.id) });
    if (!setGuestCookie(res, voterId)) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return res;
  } catch (error) {
    console.error("gate failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
