// app/api/admin/manual/technical/route.ts
//
// POST { password } -> the Technical section, for admins who re-enter
// their own login password. The password is checked against Supabase in
// a throwaway session that's signed out right after, so the admin's real
// login is untouched. A few tries per 10 minutes.
//
//   200 { section }
//   401 unauthorized | wrong_password
//   429 too_many_requests

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaffUser } from "../../../../lib/admin/staff-auth";
import { rateLimit } from "../../../../lib/ln/rate-limit";
import { renderSection } from "../../../../lib/manual";

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(req, `manual-tech:${user.email}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || password.length > 200) return NextResponse.json({ error: "wrong_password" }, { status: 401 });

  const check = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await check.auth.signInWithPassword({ email: user.email, password });
  if (error) return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  // End only the throwaway session, never the admin's own.
  await check.auth.signOut({ scope: "local" }).catch(() => {});

  try {
    return NextResponse.json({ section: await renderSection("technical") }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("technical manual failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
