// app/api/ladies-night/me/route.ts
//
// GET /api/ladies-night/me
// Public. The remembered device: who this browser belongs to, and their
// state for the current show.
//   { guest: null }                        not remembered (show the gate)
//   { guest: { first_name, rsvp: null, ...} } remembered, but not RSVP'd
//                                           to this show yet (gate with
//                                           their details filled in)
//   { guest: { first_name, rsvp, voted, picks } }

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { readGuestId } from "../../../lib/ln/guest-session";
import { guestState } from "../../../lib/ln/guests";
import { getCurrentShow } from "../../../lib/ln/public-show";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ guest: null }, { headers: { "Cache-Control": "no-store" } });

  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ guest: null }, { headers: { "Cache-Control": "no-store" } });

    const guest = await guestState(db, voterId, show.id);
    let prefill = null;
    if (guest && !guest.rsvp) {
      const { data } = await db.from("ln_voters").select("first_name, last_name, email").eq("id", voterId).maybeSingle();
      prefill = data ?? null;
    }
    return NextResponse.json({ guest, prefill }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("me failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
