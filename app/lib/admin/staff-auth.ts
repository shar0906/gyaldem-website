// lib/admin/staff-auth.ts
//
// Shared server-only helper: is there a signed-in Supabase user, and are
// they on the ln_staff allowlist? A valid login alone is NOT enough —
// the email also has to be in ln_staff with an allowed role.
//
// Used by:
//   - app/api/admin/role/route.ts (this step)
//   - AdminPage.tsx's post-login check (next step)
//   - any future admin/artist-only API route (e.g. publishing a ballot)
//
// Needs: npm i @supabase/ssr @supabase/supabase-js
// Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//      SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_)
//
// Untested draft — written against the standard @supabase/ssr + Next 15
// pattern, not run inside your repo yet.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export type StaffRole = "admin" | "artist";
export type StaffUser = { email: string; role: StaffRole; name: string | null };

// Bypasses RLS. Server-side only — never import this into client code.
export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function requireStaffUser(
  allowed: StaffRole[] = ["admin", "artist"]
): Promise<StaffUser | null> {
  const cookieStore = await cookies();

  // Reads the visitor's session from their cookies. Read-only here, so
  // setAll is a no-op — token refresh happens in middleware, not here.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // getUser() re-validates the token with Supabase, unlike getSession(),
  // which only trusts whatever is sitting in the cookie.
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;

  const { data: row, error } = await serviceClient()
    .from("ln_staff")
    .select("role, name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    // Surfaces in your terminal (npm run dev), not the browser — this is
    // what was being silently swallowed before.
    console.error("ln_staff lookup failed:", error);
    return null;
  }

  if (!row || !allowed.includes(row.role as StaffRole)) return null;
  return { email, role: row.role as StaffRole, name: row.name };
}