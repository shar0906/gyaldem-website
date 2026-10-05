// app/api/cron/kit/route.ts
//
// POST /api/cron/kit   (GET works too, for schedulers that only GET)
// Sends queued Ladies Night guests to Kit. Meant to be called every
// minute by a scheduler (see the pg_cron setup file). Requires the
// header  Authorization: Bearer <CRON_SECRET>  so nobody else can run it.
//
//   200 { sent, retrying, failed }

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { processKitQueue } from "../../../lib/ln/kit";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await processKitQueue(serviceClient()));
  } catch (error) {
    console.error("kit worker failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
