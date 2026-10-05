// lib/ln/rate-limit.ts
//
// Simple per-visitor limits on the public ballot routes, so nobody can
// hammer the gate or the email lookup. Counts live in this server's
// memory, which is right for one Railway instance. If the site ever runs
// on several instances, move these counts to the database or Redis.

import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

// true when the request is allowed.
export function rateLimit(req: NextRequest, name: string, limit: number, windowMs: number): boolean {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}
