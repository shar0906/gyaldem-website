// app/api/admin/staff/members/route.ts
//
// Staff management. Super admins only.
//
// GET    -> { staff: [{ email, name, role, last_sign_in_at, invited }], me }
//           invited: has a login but hasn't signed in yet
// PATCH  { email, role }  change someone's role
// DELETE { email }        remove their access (their login stops opening
//                         any staff screen right away; artists are also
//                         deactivated so they can't be booked)
//
// Nobody can change or remove themselves, and the last super admin can't
// be demoted or removed (also enforced in the database).
//
//   403 unauthorized | own_account
//   404 not_found
//   409 last_super_admin

import { NextRequest, NextResponse } from "next/server";
import { isStaffRole, requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authUsersByEmail(db: ReturnType<typeof serviceClient>) {
  const byEmail = new Map<string, { id: string; last_sign_in_at: string | null; full_name?: string }>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), { id: u.id, last_sign_in_at: u.last_sign_in_at ?? null });
    }
    if (data.users.length < 1000) break;
  }
  return byEmail;
}

function lastSuperAdmin(error: { message?: string } | null): boolean {
  return !!error?.message?.includes("last_super_admin");
}

export async function GET() {
  const user = await requireStaffUser(["super_admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = serviceClient();
  try {
    const [{ data: rows, error }, auth] = await Promise.all([
      db.from("ln_staff").select("email, name, role"),
      authUsersByEmail(db),
    ]);
    if (error) throw error;
    const order = ["super_admin", "admin", "artist", "door", "host"];
    const staff = (rows ?? [])
      .map((r) => {
        const a = auth.get(r.email);
        return {
          email: r.email as string,
          name: (r.name as string | null) ?? null,
          role: r.role as string,
          last_sign_in_at: a?.last_sign_in_at ?? null,
          invited: !!a && !a.last_sign_in_at,
          has_login: !!a,
        };
      })
      .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || (a.name ?? a.email).localeCompare(b.name ?? b.email));
    return NextResponse.json({ staff, me: user.email }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("staff list failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireStaffUser(["super_admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { email?: unknown; role?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || !isStaffRole(body?.role)) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const role = body!.role as string;
  if (email === user.email) return NextResponse.json({ error: "own_account" }, { status: 403 });

  const db = serviceClient();
  const { data, error } = await db.from("ln_staff").update({ role }).eq("email", email).select("email, name").maybeSingle();
  if (lastSuperAdmin(error)) return NextResponse.json({ error: "last_super_admin" }, { status: 409 });
  if (error) {
    console.error("role change failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Artists need an artist profile; create one if they don't have it.
  if (role === "artist") {
    await db
      .from("ln_artists")
      .upsert({ staff_email: email, display_name: data.name ?? email.split("@")[0] }, { onConflict: "staff_email", ignoreDuplicates: true });
    await db.from("ln_artists").update({ active: true }).eq("staff_email", email);
  }

  // Keep the Supabase Users screen in step (best effort).
  try {
    const a = (await authUsersByEmail(db)).get(email);
    if (a) await db.auth.admin.updateUserById(a.id, { user_metadata: { full_name: data.name, role } });
  } catch (e) {
    console.error("metadata sync after role change failed:", e);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await requireStaffUser(["super_admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (email === user.email) return NextResponse.json({ error: "own_account" }, { status: 403 });

  const db = serviceClient();
  const { data, error } = await db.from("ln_staff").delete().eq("email", email).select("role").maybeSingle();
  if (lastSuperAdmin(error)) return NextResponse.json({ error: "last_super_admin" }, { status: 409 });
  if (error) {
    console.error("remove staff failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // An artist without access shouldn't stay bookable. Their profile, past
  // shows, and results are kept.
  if (data.role === "artist") await db.from("ln_artists").update({ active: false }).eq("staff_email", email);
  return NextResponse.json({ success: true });
}
