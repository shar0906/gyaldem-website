// lib/ln/host-state.ts
//
// Everything the host console shows for one of tonight's shows: the show
// and series, whether it's live, posts, running order, and bingo.

import type { SupabaseClient } from "@supabase/supabase-js";
import { bingoState } from "./bingo";
import { livePosts, runningOrder } from "./live";
import { liveState } from "./public-show";
import { livePath } from "./series";
import type { TonightShow } from "./tonight";

export async function hostState(db: SupabaseClient, t: TonightShow, deviceId: string | null) {
  const { show, series } = t;
  const [posts, bingo] = await Promise.all([
    livePosts(db, show.id, 100),
    show.bingo_deck_id ? bingoState(db, show, deviceId, series.call_delay_seconds) : Promise.resolve(null),
  ]);
  return {
    show: {
      id: show.id,
      title: show.title,
      event_date: show.event_date,
      event_start_time: show.event_start_time,
      theme_name: show.theme_name,
      dj_name: show.dj_name,
      series_name: series.name,
      series_slug: series.slug,
      live_path: livePath(series.slug),
      live_enabled: series.feat_live,
    },
    live: {
      state: liveState(show),
      started_at: show.live_started_at,
      ended_at: show.live_ended_at,
      posts,
      running_order: runningOrder(show),
      run_now: show.run_now,
    },
    bingo,
  };
}
