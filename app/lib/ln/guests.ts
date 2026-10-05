// lib/ln/guests.ts
//
// One set of RSVP rules for every way a guest gets in: the gate, the
// "Already RSVP'd?" email lookup, the door QR, and walk-ins typed in by
// the door. Also the guest's state on the ballot page.

import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestSource = "gate" | "door_qr" | "door_manual";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 60;

export type GuestInput = { first_name: string; last_name: string; email: string };

export function parseGuest(body: Record<string, unknown>):
  | { ok: true; value: GuestInput }
  | { ok: false; field: string; message: string } {
  const first = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const last = typeof body.last_name === "string" ? body.last_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!first || first.length > NAME_MAX) return { ok: false, field: "first_name", message: "Add your first name." };
  if (!last || last.length > NAME_MAX) return { ok: false, field: "last_name", message: "Add your last name." };
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, field: "email", message: "Check your email address." };
  return { ok: true, value: { first_name: first, last_name: last, email } };
}

export function parseEmail(v: unknown): string | null {
  const email = typeof v === "string" ? v.trim().toLowerCase() : "";
  return EMAIL.test(email) && email.length <= 254 ? email : null;
}

// Creates or updates the guest, then their RSVP for this show. Returns
// the guest id. An existing RSVP keeps its original time and source; a
// newer share-with-artist answer replaces the old one.
export async function upsertGuestRsvp(
  db: SupabaseClient,
  opts: {
    showId: string;
    guest: GuestInput;
    source: GuestSource;
    shareWithArtist: boolean;
    checkIn?: { by: string } | null;
  }
): Promise<{ voterId: string; rsvpId: string }> {
  const { guest } = opts;
  const { data: voter, error: voterError } = await db
    .from("ln_voters")
    .upsert(
      {
        email: guest.email,
        first_name: guest.first_name,
        last_name: guest.last_name,
        name: `${guest.first_name} ${guest.last_name}`,
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (voterError || !voter) throw voterError ?? new Error("voter upsert returned nothing");

  const rsvpId = await ensureRsvp(db, {
    showId: opts.showId,
    voterId: voter.id,
    source: opts.source,
    shareWithArtist: opts.shareWithArtist,
    checkIn: opts.checkIn,
  });
  await enqueueKit(db, voter.id, opts.showId);
  return { voterId: voter.id, rsvpId };
}

export async function ensureRsvp(
  db: SupabaseClient,
  opts: { showId: string; voterId: string; source: GuestSource; shareWithArtist?: boolean; checkIn?: { by: string } | null }
): Promise<string> {
  const { data: existing, error: findError } = await db
    .from("ln_rsvps")
    .select("id, checked_in_at")
    .eq("event_id", opts.showId)
    .eq("voter_id", opts.voterId)
    .maybeSingle();
  if (findError) throw findError;

  const checkIn =
    opts.checkIn && !existing?.checked_in_at
      ? { checked_in_at: new Date().toISOString(), checked_in_by: opts.checkIn.by }
      : {};

  if (existing) {
    const update = {
      ...(opts.shareWithArtist !== undefined && { share_with_artist: opts.shareWithArtist }),
      ...checkIn,
    };
    if (Object.keys(update).length) {
      const { error } = await db.from("ln_rsvps").update(update).eq("id", existing.id);
      if (error) throw error;
    }
    return existing.id;
  }

  const { data: created, error: insertError } = await db
    .from("ln_rsvps")
    .insert({
      event_id: opts.showId,
      voter_id: opts.voterId,
      source: opts.source,
      share_with_artist: opts.shareWithArtist ?? false,
      ...checkIn,
    })
    .select("id")
    .single();
  if (insertError?.code === "23505") {
    // Same guest submitted twice at once; the other request won.
    return ensureRsvp(db, { ...opts, source: opts.source });
  }
  if (insertError || !created) throw insertError ?? new Error("rsvp insert returned nothing");
  return created.id;
}

// Queues the guest for Kit (mailing list plus show and artist tags). The
// Kit worker sends these in the background, so a slow Kit never slows
// the gate down.
export async function enqueueKit(db: SupabaseClient, voterId: string, showId: string): Promise<void> {
  const { error } = await db
    .from("ln_kit_queue")
    .upsert({ voter_id: voterId, event_id: showId }, { onConflict: "voter_id,event_id", ignoreDuplicates: true });
  if (error) console.error("kit enqueue failed (guest still RSVP'd):", error);
}

// Everything the ballot page needs to know about this guest for this show.
export async function guestState(db: SupabaseClient, voterId: string, showId: string) {
  const [voterRes, rsvpRes, picksRes] = await Promise.all([
    db.from("ln_voters").select("first_name, name").eq("id", voterId).maybeSingle(),
    db
      .from("ln_rsvps")
      .select("id, share_with_artist, table_reserved_at, checked_in_at")
      .eq("event_id", showId)
      .eq("voter_id", voterId)
      .maybeSingle(),
    db.from("ln_votes").select("song_id").eq("event_id", showId).eq("voter_id", voterId),
  ]);
  const failed = voterRes.error ?? rsvpRes.error ?? picksRes.error;
  if (failed) throw failed;
  if (!voterRes.data) return null;

  let vipPasses = 0;
  if (rsvpRes.data) {
    const { data: orders, error } = await db
      .from("ln_vip_orders")
      .select("quantity")
      .eq("rsvp_id", rsvpRes.data.id)
      .eq("status", "paid");
    if (error) throw error;
    vipPasses = (orders ?? []).reduce((n, o) => n + o.quantity, 0);
  }

  const picks = (picksRes.data ?? []).map((p) => p.song_id as string);
  return {
    first_name: voterRes.data.first_name ?? voterRes.data.name.split(" ")[0],
    rsvp: rsvpRes.data
      ? {
          share_with_artist: rsvpRes.data.share_with_artist,
          table_reserved: !!rsvpRes.data.table_reserved_at,
          checked_in: !!rsvpRes.data.checked_in_at,
          vip_passes: vipPasses,
        }
      : null,
    voted: picks.length > 0,
    picks,
  };
}
