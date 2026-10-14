// lib/ln/bingo.ts
//
// Bingo for a show: its deck, the latest round, every line drawn so far
// (in order), who's holding the mic, and what guests can see.
//
// A drawn line is private to the host until it's called. Guests see it
// call_delay_seconds after the call (the series sets the delay, 5 by
// default), so the DJ can read it out first.

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEVICE_ID = /^[A-Za-z0-9-]{8,64}$/;
export const ROUNDS_PER_NIGHT = 3;

export type DeckKind = "match" | "callout_answer";
export type CardFace = "answer" | "artist";
export type DeckInfo = { id: string; name: string; kind: DeckKind; card_face: CardFace; size: number };

type Entry = { line: string; song: string | null; artist: string | null };

// "Nobody Supposed to Be Here by Deborah Cox". Song and artist stay
// separate in the deck; they're only joined for display.
export function answerText(e: Entry): string | null {
  if (!e.song && !e.artist) return null;
  if (e.song && e.artist) return `${e.song} by ${e.artist}`;
  return e.song ?? e.artist;
}

// What's printed on the card square for this line.
export function cardText(e: Entry, kind: DeckKind, face: CardFace): string {
  if (kind === "match") return e.line;
  if (face === "artist") return e.artist ?? e.song ?? e.line;
  return answerText(e) ?? e.line;
}

export type Draw = {
  order: number;
  line: string;
  song: string | null;
  artist: string | null;
  answer: string | null; // "Song by Artist" (callout -> answer decks)
  card: string; // what's on the card
  drawn_at: string;
  called_at: string | null;
  visible_at: string | null; // when guests see it
};

type DrawRow = {
  draw_order: number;
  drawn_at: string;
  called_at: string | null;
  ln_bingo_entries: Entry | null;
};

export async function deckInfo(db: SupabaseClient, deckId: string | null): Promise<DeckInfo | null> {
  if (!deckId) return null;
  const [deckRes, countRes] = await Promise.all([
    db.from("ln_bingo_decks").select("id, name, kind, card_face").eq("id", deckId).maybeSingle(),
    db.from("ln_bingo_entries").select("id", { count: "exact", head: true }).eq("deck_id", deckId).eq("active", true),
  ]);
  if (deckRes.error || countRes.error) throw deckRes.error ?? countRes.error;
  if (!deckRes.data) return null;
  return { ...(deckRes.data as Omit<DeckInfo, "size">), size: countRes.count ?? 0 };
}

export async function bingoState(
  db: SupabaseClient,
  show: { id: string; bingo_deck_id: string | null },
  deviceId: string | null,
  delaySeconds: number
) {
  const [roundRes, deck] = await Promise.all([
    db
      .from("ln_bingo_rounds")
      .select("id, round_number, started_at, ended_at, caller_device_id, caller_email, caller_since")
      .eq("event_id", show.id)
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    deckInfo(db, show.bingo_deck_id),
  ]);
  if (roundRes.error) throw roundRes.error;

  const round = roundRes.data;
  let draws: Draw[] = [];
  if (round) {
    const { data, error } = await db
      .from("ln_bingo_draws")
      .select("draw_order, drawn_at, called_at, ln_bingo_entries(line, song, artist)")
      .eq("round_id", round.id)
      .order("draw_order", { ascending: true })
      .returns<DrawRow[]>();
    if (error) throw error;
    const kind = deck?.kind ?? "callout_answer";
    const face = deck?.card_face ?? "answer";
    draws = (data ?? []).flatMap((d) =>
      d.ln_bingo_entries
        ? [
            {
              order: d.draw_order,
              line: d.ln_bingo_entries.line,
              song: d.ln_bingo_entries.song,
              artist: d.ln_bingo_entries.artist,
              answer: kind === "callout_answer" ? answerText(d.ln_bingo_entries) : null,
              card: cardText(d.ln_bingo_entries, kind, face),
              drawn_at: d.drawn_at,
              called_at: d.called_at,
              visible_at: d.called_at ? new Date(new Date(d.called_at).getTime() + delaySeconds * 1000).toISOString() : null,
            },
          ]
        : []
    );
  }

  return {
    deck,
    rounds_per_night: ROUNDS_PER_NIGHT,
    delay_seconds: delaySeconds,
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
    deck_size: deck?.size ?? 0,
  };
}

// What guests may see of the current round: only lines that are called
// and past the delay. The newest one's answer stays hidden until the
// next line is shown (so the current call stays a guessing game); once
// the round is over, every answer shows.
export function guestCalls(draws: Draw[], now: Date = new Date(), revealAll = false) {
  const seen = draws.filter((d) => d.visible_at && new Date(d.visible_at).getTime() <= now.getTime());
  return seen.map((d, i) => {
    const reveal = revealAll || i < seen.length - 1;
    return {
      order: d.order,
      callout: d.line,
      answer: reveal ? d.answer : null,
      card: d.answer && !reveal ? null : d.card,
    };
  });
}
