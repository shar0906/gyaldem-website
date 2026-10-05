// app/api/cron/results/route.ts
//
// POST /api/cron/results   (GET works too)
// Emails People's Choice results for every show whose voting has closed
// and hasn't been emailed yet. Called hourly by the scheduler. Requires
// Authorization: Bearer <CRON_SECRET>.
//
// Only looks back two weeks, so turning this on never mass-emails old
// shows. A show whose email fails is retried on the next run.
//
//   200 { sent, skipped, failed }

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { cronAuthorized } from "../../../lib/ln/cron-auth";
import { sendShowResults } from "../../../lib/ln/results-email";
import { mailerConfigured } from "../../../lib/ln/mailer";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 14;

async function run(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!mailerConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const db = serviceClient();
  const now = new Date();
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
    return NextResponse.json({ sent, skipped, failed });
  } catch (error) {
    console.error("results cron failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
