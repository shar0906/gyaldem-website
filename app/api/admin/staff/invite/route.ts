// app/api/admin/staff/invite/route.ts
//
// POST /api/admin/staff/invite
// Body: { email: string, name?: string, role: "admin" | "artist" | "door" | "host" }
// Admin-only.
//
// 1. Adds or updates the person in ln_staff, so they're authorized the
//    moment they click the email.
// 2. For artists, creates their artist profile (not public until an
//    admin approves it). Re-inviting never overwrites an existing profile.
// 3. Emails them:
//    - new account: Supabase's invite email, to set a password
//    - existing account (re-invite, or a login deleted and re-added):
//      a password-reset email instead of failing
//
//   200 { success: true, email_sent: "invite" | "reset" }
//   400 missing_fields | bad_role | bad_email
//   429 rate_limited (too many auth emails this hour)
//   502 email_failed { message }
//
// Supabase email templates (Authentication -> Email Templates) must link
// to the site's own /auth/confirm route, not supabase.co:
//   Invite user:    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/set-password
//   Reset Password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/set-password

import { NextRequest, NextResponse } from "next/server";
import { isStaffRole, requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isExistingUserError(error: { code?: string; status?: number; message?: string }): boolean {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered/i.test(error.message ?? "")
  );
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: unknown; name?: unknown; role?: unknown }
    | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : null;
  const role = body?.role;

  if (!email || !role) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }
  if (!isStaffRole(role)) {
    return NextResponse.json({ error: "bad_role" }, { status: 400 });
  }

  const db = serviceClient();

  const { error: staffError } = await db
    .from("ln_staff")
    .upsert({ email, name, role }, { onConflict: "email" });
  if (staffError) {
    console.error("ln_staff upsert failed:", staffError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (role === "artist") {
    const { error: artistError } = await db
      .from("ln_artists")
      .upsert(
        { staff_email: email, display_name: name ?? email.split("@")[0] },
        { onConflict: "staff_email", ignoreDuplicates: true }
      );
    if (artistError) {
      console.error("artist profile create failed:", artistError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name, role },
  });

  if (!inviteError) {
    return NextResponse.json({ success: true, email_sent: "invite" });
  }

  if (inviteError.status === 429) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!isExistingUserError(inviteError)) {
    console.error("invite failed:", inviteError);
    return NextResponse.json({ error: "email_failed", message: inviteError.message }, { status: 502 });
  }

  // They already have a login: send a password reset so they can get in.
  const { error: resetError } = await db.auth.resetPasswordForEmail(email);
  if (resetError) {
    if (resetError.status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("reset email failed:", resetError);
    return NextResponse.json({ error: "email_failed", message: resetError.message }, { status: 502 });
  }

  return NextResponse.json({ success: true, email_sent: "reset" });
}
