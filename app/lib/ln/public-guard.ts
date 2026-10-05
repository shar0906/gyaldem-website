// lib/ln/public-guard.ts
//
// Shared opening steps for the public guest routes: rate limit, then the
// current show and whether this request may RSVP to it.

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rateLimit } from "./rate-limit";
import { getCurrentShow, isValidDoorCode, rsvpOpen, showStage } from "./public-show";
import type { ShowRow } from "./shows";
import type { ShowStage } from "./show-status";

export type OpenShow = { show: ShowRow; stage: ShowStage; door: boolean };

export function tooMany(): NextResponse {
  return NextResponse.json({ error: "too_many_requests", message: "Too many tries. Wait a minute and try again." }, { status: 429 });
}

export async function loadOpenShow(
  db: SupabaseClient,
  doorCode: unknown
): Promise<{ ok: true; value: OpenShow } | { ok: false; response: NextResponse }> {
  const show = await getCurrentShow(db);
  if (!show) {
    return { ok: false, response: NextResponse.json({ error: "no_show" }, { status: 404 }) };
  }
  const stage = showStage(show);
  const door = isValidDoorCode(show, typeof doorCode === "string" ? doorCode : null);
  if (!door && !rsvpOpen(stage)) {
    return { ok: false, response: NextResponse.json({ error: "rsvp_closed", stage }, { status: 409 }) };
  }
  return { ok: true, value: { show, stage, door } };
}

export function limited(req: NextRequest, name: string, perMinute: number): boolean {
  return !rateLimit(req, name, perMinute, 60_000);
}
