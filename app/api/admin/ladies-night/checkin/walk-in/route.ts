// app/api/admin/ladies-night/checkin/walk-in/route.ts
//
// POST -> walk-in typed in by the door (for guests without a phone).
// Body: { first_name, last_name, email, consent: true }
// consent is the door's "Guest agreed to RSVP and join the mailing list"
// box. RSVPs them to tonight's show, queues them for Kit, and checks them
// in, all at once. Admin or door logins.
//
//   200 { success: true, rsvp_id }
//   400 { error: "invalid", field, message } | consent_required
//   409 no_show_tonight

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { parseGuest, upsertGuestRsvp } from "../../../../../lib/ln/guests";
import { getTonightShow } from "../../../../../lib/ln/tonight";

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin", "door"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "consent_required" }, { status: 400 });

  const parsed = parseGuest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });
  }

  const db = serviceClient();
  try {
    const show = await getTonightShow(db);
    if (!show) return NextResponse.json({ error: "no_show_tonight" }, { status: 409 });

    const { rsvpId } = await upsertGuestRsvp(db, {
      showId: show.id,
      guest: parsed.value,
      source: "door_manual",
      shareWithArtist: false,
      checkIn: { by: user.email },
    });
    return NextResponse.json({ success: true, rsvp_id: rsvpId });
  } catch (error) {
    console.error("walk-in failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
