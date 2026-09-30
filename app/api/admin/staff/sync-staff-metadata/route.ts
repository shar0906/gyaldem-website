// app/api/admin/staff/sync-staff-metadata/route.ts
//
// POST /api/admin/staff/sync-staff-metadata
// Admin-only, one-off/occasional use. For every ln_staff row, finds the
// matching Supabase Auth user by email and sets user_metadata to include
// full_name and role — this is what backfills the Supabase dashboard's
// own Users screen for accounts created before invites set this
// automatically (i.e. the three you made by hand).
//
// Safe to run more than once — it just re-sets the same values. Also
// safe to re-run after changing someone's role in ln_staff directly, to
// push that change into their Auth metadata too (the two aren't linked
// automatically — ln_staff.role is what the app actually checks; this
// metadata is just for your own visibility in the Supabase dashboard).
//
// Untested draft — not run inside your repo yet.

import { NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export async function POST() {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const admin = serviceClient();

  const { data: staff, error: staffError } = await admin
    .from("ln_staff")
    .select("email, name, role");

  if (staffError) {
    console.error("ln_staff lookup failed:", staffError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Small, known set of users — a single page covers it comfortably.
  const { data: authList, error: listError } = await admin.auth.admin.listUsers();

  if (listError) {
    console.error("listUsers failed:", listError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const results: Array<{ email: string; status: string }> = [];

  for (const row of staff ?? []) {
    const authUser = authList.users.find((u) => u.email?.toLowerCase() === row.email);

    if (!authUser) {
      results.push({ email: row.email, status: "no_matching_auth_user" });
      continue;
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: { ...authUser.user_metadata, full_name: row.name, role: row.role },
    });

    results.push({ email: row.email, status: updateError ? "failed" : "updated" });
    if (updateError) console.error(`updateUserById failed for ${row.email}:`, updateError);
  }

  return NextResponse.json({ results });
}