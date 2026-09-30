// app/api/admin/staff/invite/route.ts
//
// POST /api/admin/staff/invite
// Body: { email: string, name: string, role: "admin" | "artist" }
// Admin-only. Upserts the ln_staff row (so the person is authorized the
// moment they accept) and sends a real Supabase invite email. They set
// their own password via app/admin/set-password/page.tsx — nothing here
// generates or stores a password on their behalf.
//
// REQUIRES a manual step in Supabase before this works: the "Invite
// user" email template needs its link changed to the token_hash format
// so app/auth/confirm/route.ts can exchange it server-side. Default
// Supabase templates use a hash-fragment link instead, which breaks
// with server-side routing. In Supabase Dashboard, go to
// Authentication -> Email Templates -> Invite user, and set the body's
// link href to:
//
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/set-password
//
// Also add /auth/confirm and /admin/set-password to Authentication ->
// URL Configuration -> Redirect URLs (using your real domain).
//
// Untested draft — not run inside your repo yet.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../lib/admin/staff-auth";

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { email, name, role } = await req.json();
  if (!email || !role || !["admin", "artist"].includes(role)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = serviceClient();

  // Grant access immediately — if they accept the invite right away,
  // there's no race where they're authenticated but not yet staff.
  const { error: staffError } = await admin
    .from("ln_staff")
    .upsert({ email: normalizedEmail, name: name?.trim() || null, role }, { onConflict: "email" });

  if (staffError) {
    console.error("ln_staff upsert failed:", staffError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // data sets user_metadata, so the Supabase dashboard's own Users
  // screen shows a real name and role too, not just this account's
  // email — visible on that user's detail page.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { full_name: name?.trim() || null, role },
  });

  if (inviteError) {
    console.error("invite failed:", inviteError);
    return NextResponse.json({ error: "invite_failed", detail: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}