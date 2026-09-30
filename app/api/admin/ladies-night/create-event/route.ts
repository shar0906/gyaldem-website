// app/api/admin/ladies-night/create-event/route.ts
//
// POST /api/admin/ladies-night/create-event
// Body: { event_date: "YYYY-MM-DD" }
// Admin-only. Actually creates the next cycle by calling ln_create_event
// via rpc — the admin should only hit this after reviewing the preview
// from next-event-preview/route.ts, with the SAME date that preview
// showed (or a manually adjusted one, e.g. shifting off a holiday).
//
// Creates as 'draft' on the public site, same as ln_create_event's own
// default — this button does NOT auto-publish. That only happens when
// the ballot itself is published (10+ songs), per the publish route.
//
// Untested draft — not run inside your repo yet.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { event_date } = await req.json();
  if (!event_date) {
    return NextResponse.json({ error: "missing_event_date" }, { status: 400 });
  }

  const { data, error } = await serviceClient().rpc("ln_create_event", {
    p_event_date: event_date,
  });

  if (error) {
    console.error("create event failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, event_id: data });
}