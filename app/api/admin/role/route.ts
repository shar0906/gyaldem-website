// app/api/admin/role/route.ts
//
// After Supabase sign-in succeeds client-side, AdminPage calls this to
// find out who they are: staff or not, and which role. This is the
// piece the old password gate could never do — a shared password has
// no concept of "who," only "yes/no."
//
// GET /api/admin/role
//   200 { email, role: "admin" | "artist" }
//   401 not signed in
//   403 signed in, but not on the ln_staff allowlist
//
// Untested draft — not run inside your repo yet.

import { NextResponse } from "next/server";
import { requireStaffUser } from "../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser();

  if (!user) {
    return NextResponse.json({ error: "not_staff" }, { status: 403 });
  }

  return NextResponse.json(user);
}