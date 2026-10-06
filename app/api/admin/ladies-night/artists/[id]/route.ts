// app/api/admin/ladies-night/artists/[id]/route.ts
//
// PATCH -> admin edits an artist directly. Admin-only.
//   Profile fields (any subset of display_name, bio, instagram_handle,
//   primary_color, accent_color, photo_url, cover_url) are merged with the
//   live profile, validated, and go live right away; an admin edit counts
//   as approval. A pending artist submission is left in the queue.
//   { active: false } deactivates: they can't log in or be booked; past
//   shows and results stay. { active: true } restores them.
//
//   200 { success: true, artist, upcoming_shows }
//   400 { error: "invalid", field, message }
//   404 not_found

import { NextRequest, NextResponse } from "next/server";
import { ARTIST_COLUMNS, ArtistRow, requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { parseProfile } from "../../../../../lib/ln/profile-rules";
import { artistFolderPublicUrl } from "../../../../../lib/ln/storage";
import { todayEastern } from "../../../../../lib/ln/dates";

type Params = { params: Promise<{ id: string }> };

const PROFILE_KEYS = [
  "display_name",
  "bio",
  "instagram_handle",
  "primary_color",
  "accent_color",
  "photo_url",
  "cover_url",
  "logo_url",
  "website_url",
] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  const { data: current, error: currentError } = await db
    .from("ln_artists")
    .select(ARTIST_COLUMNS)
    .eq("id", id)
    .maybeSingle<ArtistRow>();
  if (currentError) {
    console.error("artist lookup failed:", currentError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (PROFILE_KEYS.some((k) => k in body)) {
    const merged: Record<string, unknown> = {
      display_name: current.display_name,
      bio: current.bio,
      instagram_handle: current.instagram_handle,
      // Artists created before choosing colors get Kay's defaults until set.
      primary_color: current.primary_color ?? "#6E1420",
      accent_color: current.accent_color ?? "#C81E3A",
      photo_url: current.photo_url,
      cover_url: current.cover_url,
      logo_url: current.logo_url,
      website_url: current.website_url,
    };
    for (const k of PROFILE_KEYS) if (k in body) merged[k] = body[k];
    const parsed = parseProfile(merged, artistFolderPublicUrl(id));
    if (!parsed.ok) {
      return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.error }, { status: 400 });
    }
    Object.assign(update, parsed.value);
    if (!current.approved_at) update.approved_at = new Date().toISOString();
  }

  if ("active" in body) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "invalid", field: "active", message: "Invalid active setting." }, { status: 400 });
    }
    update.active = body.active;
  }

  const { data: artist, error } = await db
    .from("ln_artists")
    .update(update)
    .eq("id", id)
    .select(ARTIST_COLUMNS)
    .single<ArtistRow>();
  if (error || !artist) {
    console.error("artist update failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Lets the screen warn when a deactivated artist is still booked.
  const { count } = await db
    .from("ln_events")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", id)
    .eq("archived", false)
    .gte("event_date", todayEastern());

  return NextResponse.json({ success: true, artist, upcoming_shows: count ?? 0 });
}
