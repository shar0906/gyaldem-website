// app/api/ladies-night/posh/route.ts
//
// POST /api/ladies-night/posh   Body: { series?, action: "click" | "done" }
// Public, remembered guests who've RSVP'd. Records the Posh step for the
// recap: "click" when they open the series' Posh link, "done" when they
// tap that they've finished on Posh. Posh itself can't tell us.
//
//   200 { guest }
//   401 not_signed_in
//   409 rsvp_required | no_posh

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { readGuestId } from "../../../lib/ln/guest-session";
import { guestState } from "../../../lib/ln/guests";
import { limited, loadSeriesShow, tooMany } from "../../../lib/ln/public-guard";

export async function POST(req: NextRequest) {
  if (limited(req, "posh", 20)) return tooMany();
  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { series?: unknown; action?: unknown } | null;
  const action = body?.action === "click" || body?.action === "done" ? body.action : null;
  if (!action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  try {
    const loaded = await loadSeriesShow(db, body?.series);
    if (!loaded.ok) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });
    const { show, series } = loaded;
    if (!series.feat_posh || !series.posh_url) return NextResponse.json({ error: "no_posh" }, { status: 409 });

    const { data: rsvp, error } = await db
      .from("ln_rsvps")
      .select("id, posh_clicked_at, posh_confirmed_at")
      .eq("event_id", show.id)
      .eq("voter_id", voterId)
      .maybeSingle();
    if (error) throw error;
    if (!rsvp) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });

    const now = new Date().toISOString();
    const update =
      action === "click"
        ? { posh_clicked_at: rsvp.posh_clicked_at ?? now }
        : { posh_clicked_at: rsvp.posh_clicked_at ?? now, posh_confirmed_at: rsvp.posh_confirmed_at ?? now };
    const { error: saveError } = await db.from("ln_rsvps").update(update).eq("id", rsvp.id);
    if (saveError) throw saveError;

    return NextResponse.json({ guest: await guestState(db, voterId, show.id) });
  } catch (error) {
    console.error("posh step failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
