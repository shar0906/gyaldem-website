// app/api/cron/results/route.ts
//
// POST /api/cron/results   (GET works too)
// Called hourly by the scheduler. Requires Authorization: Bearer <CRON_SECRET>.
//   - People's Choice results to the artist, for every show whose voting
//     has closed and hasn't been emailed yet
//   - The recap (RSVPs, tables, VIP, live visits, winners) to the
//     series' client, the day after each show
//
// Only looks back two weeks, so turning this on never mass-emails old
// shows. A show whose email fails is retried on the next run.
//
//   200 { sent, skipped, failed, recaps: { sent, failed } }

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { cronAuthorized } from "../../../lib/ln/cron-auth";
import { sendShowResults } from "../../../lib/ln/results-email";
import { sendShowRecap } from "../../../lib/ln/recap";
import { listOpenNoBallotShows } from "../../../lib/ln/shows";
import { todayEastern } from "../../../lib/ln/dates";
import { mailerConfigured } from "../../../lib/ln/mailer";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 14;

async function run(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = serviceClient();
  const now = new Date();

  // Shows without a ballot go on the Events page once RSVP opens. Runs
  // even when email isn't set up.
  let listed = 0;
  try {
    listed = await listOpenNoBallotShows(db, now);
  } catch (err) {
    console.error("events listing failed:", err);
  }
  if (!mailerConfigured()) return NextResponse.json({ error: "not_configured", listed }, { status: 503 });

  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86400 * 1000);

  try {
    const { data: due, error } = await db
      .from("ln_events")
      .select("id")
      .eq("archived", false)
      .is("results_emailed_at", null)
      .not("artist_id", "is", null)
      .lte("voting_closes_at", now.toISOString())
      .gte("voting_closes_at", since.toISOString());
    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const show of due ?? []) {
      try {
        if ((await sendShowResults(db, show.id)) === "sent") sent++;
        else skipped++;
      } catch (err) {
        console.error(`results email for ${show.id} failed:`, err);
        failed++;
      }
    }
    // Recaps: shows from the last two weeks that are over (yesterday or
    // earlier, Eastern).
    const { data: over, error: overError } = await db
      .from("ln_events")
      .select("id")
      .eq("archived", false)
      .is("recap_emailed_at", null)
      .lt("event_date", todayEastern(now))
      .gte("event_date", since.toISOString().slice(0, 10));
    if (overError) throw overError;
    const recaps = { sent: 0, failed: 0 };
    for (const show of over ?? []) {
      try {
        await sendShowRecap(db, show.id);
        recaps.sent++;
      } catch (err) {
        console.error(`recap email for ${show.id} failed:`, err);
        recaps.failed++;
      }
    }

    return NextResponse.json({ sent, skipped, failed, recaps, listed });
  } catch (error) {
    console.error("results cron failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
