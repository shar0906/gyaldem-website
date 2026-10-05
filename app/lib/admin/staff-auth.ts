// lib/admin/staff-auth.ts
//
// Shared server-only helpers: is there a signed-in Supabase user, and are
// they on the ln_staff allowlist with an allowed role? A valid login alone
// is NOT enough; the email also has to be in ln_staff.
//
// Roles:
//   admin  - everything (you and Rin)
//   artist - Propose, Profile, Results for their own shows only
//   door   - check-in screen only
//   host   - bingo caller only
//
// Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
//      SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_)

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const STAFF_ROLES = ["admin", "artist", "door", "host"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type StaffUser = { email: string; role: StaffRole; name: string | null };

export type ArtistRow = {
  id: string;
  staff_email: string;
  display_name: string;
  photo_url: string | null;
  cover_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  primary_color: string | null;
  accent_color: string | null;
  approved_at: string | null;
  active: boolean;
};

export const ARTIST_COLUMNS =
  "id, staff_email, display_name, photo_url, cover_url, bio, instagram_handle, primary_color, accent_color, approved_at, active";

// Bypasses RLS. Server-side only. Never import this into client code.
export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

// Default stays admin + artist so existing routes don't silently widen
// to door/host logins. Routes that door or host should reach pass their
// roles explicitly.
export async function requireStaffUser(
  allowed: readonly StaffRole[] = ["admin", "artist"]
): Promise<StaffUser | null> {
  const cookieStore = await cookies();

  // Read-only here: the session-refresh middleware keeps cookies fresh.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // getUser() re-validates the token with Supabase, unlike getSession().
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;

  const { data: row, error } = await serviceClient()
    .from("ln_staff")
    .select("role, name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("ln_staff lookup failed:", error);
    return null;
  }

  if (!row || !isStaffRole(row.role) || !allowed.includes(row.role)) return null;
  return { email, role: row.role, name: row.name };
}

// For artist-only routes: the signed-in artist plus their artist row.
// Returns null (treat as 403) if they're not an artist, have no artist
// row, or have been deactivated.
export async function requireArtist(): Promise<{ user: StaffUser; artist: ArtistRow } | null> {
  const user = await requireStaffUser(["artist"]);
  if (!user) return null;

  const { data: artist, error } = await serviceClient()
    .from("ln_artists")
    .select(ARTIST_COLUMNS)
    .eq("staff_email", user.email)
    .maybeSingle<ArtistRow>();

  if (error) {
    console.error("ln_artists lookup failed:", error);
    return null;
  }
  if (!artist || !artist.active) return null;
  return { user, artist };
}
