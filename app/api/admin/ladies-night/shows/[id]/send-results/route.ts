// app/api/admin/ladies-night/shows/[id]/send-results/route.ts
//
// POST -> send (or resend) a show's results email now. Admin-only.
// Works any time after voting closes.
//
//   200 { success: true, sent_at }
//   400 voting_open | no_artist
//   503 not_configured (SMTP settings missing)
//   502 email_failed { message }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { sendShowResults } from "../../../../../../lib/ln/results-email";
import { mailerConfigured } from "../../../../../../lib/ln/mailer";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  if (!mailerConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { id } = await params;

  const db = serviceClient();
  const { data: show, error } = await db.from("ln_events").select("voting_closes_at, artist_id").eq("id", id).maybeSingle();
  if (error) {
    console.error("send-results lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!show) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (new Date(show.voting_closes_at).getTime() > Date.now()) return NextResponse.json({ error: "voting_open" }, { status: 400 });
  if (!show.artist_id) return NextResponse.json({ error: "no_artist" }, { status: 400 });

  try {
    await sendShowResults(db, id);
    return NextResponse.json({ success: true, sent_at: new Date().toISOString() });
  } catch (err) {
    console.error("send-results failed:", err);
    return NextResponse.json({ error: "email_failed", message: String((err as Error)?.message ?? err).slice(0, 200) }, { status: 502 });
  }
}
