// app/api/ladies-night/forget/route.ts
//
// POST /api/ladies-night/forget
// Public. "Not you?": this browser stops being remembered. Nothing about
// the guest is deleted; the next person just sees the regular gate.

import { NextResponse } from "next/server";
import { clearGuestCookie } from "../../../lib/ln/guest-session";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearGuestCookie(res);
  return res;
}
