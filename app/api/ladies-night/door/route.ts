// app/api/ladies-night/door/route.ts
//
// POST /api/ladies-night/door
// Body: { door: string }
// Public. A remembered guest who scans the door QR on show night: checks
// them in with one tap, no typing. RSVPs them first if they somehow
// aren't on tonight's list.
//
//   200 { guest }
//   401 not_signed_in (not remembered: show the gate instead)
//   409 rsvp_closed (not show night, or wrong code)

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { readGuestId } from "../../../lib/ln/guest-session";
import { ensureRsvp, enqueueKit, guestState } from "../../../lib/ln/guests";
import { getCurrentShow, isValidDoorCode } from "../../../lib/ln/public-show";
import { limited, tooMany } from "../../../lib/ln/public-guard";

export async function POST(req: NextRequest) {
  if (limited(req, "door", 10)) return tooMany();
  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { door?: unknown } | null;
  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show || !isValidDoorCode(show, typeof body?.door === "string" ? body.door : null)) {
      return NextResponse.json({ error: "rsvp_closed" }, { status: 409 });
    }
    const { data: voter, error } = await db.from("ln_voters").select("id").eq("id", voterId).maybeSingle();
    if (error) throw error;
    if (!voter) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

    await ensureRsvp(db, { showId: show.id, voterId, source: "door_qr", checkIn: { by: "door_qr" } });
    await enqueueKit(db, voterId, show.id);
    return NextResponse.json({ guest: await guestState(db, voterId, show.id) });
  } catch (error) {
    console.error("door self check-in failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
