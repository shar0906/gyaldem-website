// lib/ln/cron-auth.ts
//
// Scheduled jobs must send  Authorization: Bearer <CRON_SECRET>.

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
