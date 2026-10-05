// app/api/ladies-night/vote/route.ts
//
// POST /api/ladies-night/vote
// Body: { song_ids: string[] }   1 to 5 published songs
// Public, remembered guests only, and they must be RSVP'd to the show.
// Submitting again replaces their picks, until voting closes.
//
//   200 { guest }
//   400 invalid_pick_count | invalid_songs
//   401 not_signed_in (no remembered device: show the gate)
//   409 rsvp_required | voting_closed
//   429 too_many_requests

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { readGuestId } from "../../../lib/ln/guest-session";
import { guestState } from "../../../lib/ln/guests";
import { getCurrentShow } from "../../../lib/ln/public-show";
import { limited, tooMany } from "../../../lib/ln/public-guard";

const KNOWN_ERRORS: Record<string, number> = {
  voting_closed: 409,
  invalid_pick_count: 400,
  invalid_songs: 400,
  voter_not_found: 401,
};

export async function POST(req: NextRequest) {
  if (limited(req, "vote", 20)) return tooMany();

  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { song_ids?: unknown } | null;
  const ids = Array.isArray(body?.song_ids) ? body.song_ids.filter((x): x is string => typeof x === "string") : [];
  if (ids.length < 1 || ids.length > 5) return NextResponse.json({ error: "invalid_pick_count" }, { status: 400 });

  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ error: "voting_closed" }, { status: 409 });

    const [{ data: voter, error: voterError }, { data: rsvp, error: rsvpError }] = await Promise.all([
      db.from("ln_voters").select("email").eq("id", voterId).maybeSingle(),
      db.from("ln_rsvps").select("id").eq("event_id", show.id).eq("voter_id", voterId).maybeSingle(),
    ]);
    if (voterError || rsvpError) throw voterError ?? rsvpError;
    if (!voter) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    if (!rsvp) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });

    // The database function checks the voting window, the pick count,
    // that every song is published on this ballot, and replaces old picks.
    const { error } = await db.rpc("ln_submit_ballot", { p_event: show.id, p_email: voter.email, p_song_ids: ids });
    if (error) {
      const known = Object.keys(KNOWN_ERRORS).find((k) => error.message?.includes(k));
      if (known) return NextResponse.json({ error: known === "voter_not_found" ? "not_signed_in" : known }, { status: KNOWN_ERRORS[known] });
      throw error;
    }

    return NextResponse.json({ guest: await guestState(db, voterId, show.id) });
  } catch (error) {
    console.error("vote failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
