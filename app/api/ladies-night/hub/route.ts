// app/api/ladies-night/hub/route.ts
//
// GET /api/ladies-night/hub
// Public. Every active series for /ladies-night, in display order, each
// with its next show (date, venue, theme) when one is scheduled.

import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { hubSeries } from "../../../lib/ln/hub";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ series: await hubSeries(serviceClient()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("hub failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
