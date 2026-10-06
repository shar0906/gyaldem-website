// app/api/cron/kit/route.ts
//
// POST /api/cron/kit   (GET works too, for schedulers that only GET)
// Sends queued Ladies Night guests to Kit, then schedules each show's
// reminder email in Kit (see lib/ln/reminder.ts). Called hourly by the
// scheduler (see the cron schedule SQL). Requires the header
// Authorization: Bearer <CRON_SECRET>  so nobody else can run it.
//
//   200 { sent, retrying, failed }

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { processKitQueue } from "../../../lib/ln/kit";
import { processReminders } from "../../../lib/ln/reminder";
import { cronAuthorized } from "../../../lib/ln/cron-auth";

export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const db = serviceClient();
    // Tag new guests first, then schedule or update show reminders, so a
    // reminder always targets an up-to-date tag.
    const guests = await processKitQueue(db);
    const reminders = await processReminders(db).catch((e) => ({ error: String(e?.message ?? e) }));
    return NextResponse.json({ ...guests, reminders });
  } catch (error) {
    console.error("kit worker failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
