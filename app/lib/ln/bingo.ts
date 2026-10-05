// lib/ln/bingo.ts
//
// Bingo state for the host screen: tonight's latest round, every line
// called so far (in order), who's holding the mic, and the deck size.

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/;

type DrawRow = {
  draw_order: number;
  drawn_at: string;
  ln_bingo_entries: { line: string; song: string; artist: string } | null;
};

export async function bingoState(db: SupabaseClient, showId: string, deviceId: string | null) {
  const [roundRes, deckRes] = await Promise.all([
    db
      .from("ln_bingo_rounds")
      .select("id, round_number, started_at, ended_at, caller_device_id, caller_email, caller_since")
      .eq("event_id", showId)
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("ln_bingo_entries").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  if (roundRes.error || deckRes.error) throw roundRes.error ?? deckRes.error;

  const round = roundRes.data;
  let draws: { order: number; line: string; song: string; artist: string; drawn_at: string }[] = [];
  if (round) {
    const { data, error } = await db
      .from("ln_bingo_draws")
      .select("draw_order, drawn_at, ln_bingo_entries(line, song, artist)")
      .eq("round_id", round.id)
      .order("draw_order", { ascending: true })
      .returns<DrawRow[]>();
    if (error) throw error;
    draws = (data ?? []).flatMap((d) =>
      d.ln_bingo_entries
        ? [{ order: d.draw_order, drawn_at: d.drawn_at, ...d.ln_bingo_entries }]
        : []
    );
  }

  return {
    round: round
      ? {
          id: round.id,
          number: round.round_number,
          ended: !!round.ended_at,
          caller: round.caller_device_id
            ? { email: round.caller_email, since: round.caller_since, is_you: round.caller_device_id === deviceId }
            : null,
        }
      : null,
    draws,
    last_order: draws.length ? draws[draws.length - 1].order : 0,
    deck_size: deckRes.count ?? 0,
  };
}
