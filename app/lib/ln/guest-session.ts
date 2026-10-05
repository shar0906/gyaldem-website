// lib/ln/guest-session.ts
//
// "Remembered device" for the public ballot page. After the gate, the
// guest's browser gets a signed, httpOnly cookie holding their guest id.
// The page can't read or forge it; the server checks the signature on
// every request. "Not you?" clears it.
//
// Env: LN_GUEST_SECRET, a long random string (at least 32 characters).
// Without it, guest sessions are refused rather than signed weakly.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const GUEST_COOKIE = "ln_guest";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // about six months

function secret(): string | null {
  const s = process.env.LN_GUEST_SECRET;
  return s && s.length >= 32 ? s : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function readGuestId(req: NextRequest): string | null {
  const key = secret();
  const raw = req.cookies.get(GUEST_COOKIE)?.value;
  if (!key || !raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { v?: string };
    return typeof data.v === "string" ? data.v : null;
  } catch {
    return null;
  }
}

// Returns false when the server isn't configured, so the route can fail
// loudly instead of silently not remembering anyone.
export function setGuestCookie(res: NextResponse, voterId: string): boolean {
  const key = secret();
  if (!key) {
    console.error("LN_GUEST_SECRET is missing or under 32 characters");
    return false;
  }
  const payload = Buffer.from(JSON.stringify({ v: voterId, t: Date.now() })).toString("base64url");
  res.cookies.set(GUEST_COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export function clearGuestCookie(res: NextResponse): void {
  res.cookies.set(GUEST_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
