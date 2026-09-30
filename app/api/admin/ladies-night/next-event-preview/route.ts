// app/api/admin/ladies-night/next-event-preview/route.ts
//
// GET /api/admin/ladies-night/next-event-preview
// Admin-only. Computes what the NEXT cycle would look like without
// creating anything — the date (latest existing event + 14 days) and
// the auto-suggested voting window (via ln_suggest_next_event_window,
// the same function ln_create_event uses internally). This is what
// powers the preview step before the admin actually clicks confirm.
//
// Untested draft — not run inside your repo yet.

import { NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const admin = serviceClient();

  const { data: latest, error: latestError } = await admin
    .from("ln_events")
    .select("event_date")
    .eq("archived", false)
    .order("event_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error("latest event lookup failed:", latestError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!latest) {
    // No events exist at all yet — shouldn't happen post-inaugural, but
    // don't guess a date if it does.
    return NextResponse.json({ error: "no_existing_event" }, { status: 400 });
  }

  const previousDate = new Date(latest.event_date + "T00:00:00Z");
  const nextDate = new Date(previousDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 14);
  const nextDateStr = nextDate.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: window, error: windowError } = await admin.rpc(
    "ln_suggest_next_event_window",
    { p_event_date: nextDateStr }
  );

  if (windowError) {
    console.error("window suggestion failed:", windowError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // rpc() for a function returning `table(...)` comes back as an array.
  const suggestion = Array.isArray(window) ? window[0] : window;

  return NextResponse.json({
    previous_event_date: latest.event_date,
    next_event_date: nextDateStr,
    voting_opens_at: suggestion?.voting_opens_at ?? null,
    voting_closes_at: suggestion?.voting_closes_at ?? null,
  });
}