// lib/ln/live.ts
//
// What the live page shows for a show: host announcements and winners,
// bingo calls, the running order with what's on now, and where things
// stand (before, live, after). Safe to send to anyone: no guest data.

import type { SupabaseClient } from "@supabase/supabase-js";
import { bingoState, guestCalls, ROUNDS_PER_NIGHT } from "./bingo";
import type { RunItem, ShowRow } from "./shows";
import { liveState } from "./public-show";

export type LivePost = { id: string; kind: "announcement" | "winner"; body: string; round_number: number | null; created_at: string };

export async function livePosts(db: SupabaseClient, showId: string, limit = 50): Promise<LivePost[]> {
  const { data, error } = await db
    .from("ln_live_posts")
    .select("id, kind, body, round_number, created_at")
    .eq("event_id", showId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<LivePost[]>();
  if (error) throw error;
  return data ?? [];
}

// The show's own run of show, or the series' master one when the show
// has none, so the live page is never left without a plan.
export function runningOrder(
  show: Pick<ShowRow, "running_order">,
  series?: { default_running_order?: RunItem[] | null } | null
): RunItem[] {
  const own = Array.isArray(show.running_order) ? show.running_order : [];
  if (own.length) return own;
  return Array.isArray(series?.default_running_order) ? series!.default_running_order! : [];
}

export async function publicLive(
  db: SupabaseClient,
  show: ShowRow,
  series: { call_delay_seconds: number; default_running_order?: RunItem[] | null },
  now: Date = new Date()
) {
  const delaySeconds = series.call_delay_seconds;
  const state = liveState(show, now);
  const [posts, bingo] = await Promise.all([
    livePosts(db, show.id),
    show.bingo_deck_id ? bingoState(db, show, null, delaySeconds) : Promise.resolve(null),
  ]);

  let bingoView = null;
  if (bingo && bingo.deck) {
    const calls = bingo.round ? guestCalls(bingo.draws, now, bingo.round.ended) : [];
    // Lines already called but still inside the delay: the page refreshes
    // again right when the next one is due.
    const pending = bingo.draws.find((d) => d.visible_at && new Date(d.visible_at).getTime() > now.getTime());
    bingoView = {
      deck_kind: bingo.deck.kind,
      round: bingo.round ? { number: bingo.round.number, ended: bingo.round.ended } : null,
      rounds_per_night: ROUNDS_PER_NIGHT,
      calls: calls.reverse(), // newest first
      next_visible_at: pending?.visible_at ?? null,
    };
  }

  return {
    state,
    started_at: show.live_started_at,
    posts,
    bingo: bingoView,
    running_order: runningOrder(show, series),
    has_bingo: show.has_bingo && !!show.bingo_deck_id,
    rounds_per_night: ROUNDS_PER_NIGHT,
    run_now: show.run_now,
    gallery_url: show.gallery_url,
  };
}
