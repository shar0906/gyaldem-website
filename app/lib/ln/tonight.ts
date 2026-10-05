// lib/ln/tonight.ts
//
// Tonight's show, for the door and the bingo host. "Tonight" is today's
// date in Eastern time.

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayEastern } from "./dates";
import { SHOW_COLUMNS, ShowRow } from "./shows";

export async function getTonightShow(db: SupabaseClient): Promise<ShowRow | null> {
  const { data, error } = await db
    .from("ln_events")
    .select(SHOW_COLUMNS)
    .eq("archived", false)
    .eq("event_date", todayEastern())
    .limit(1)
    .maybeSingle<ShowRow>();
  if (error) throw error;
  return data;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gyaldemsocialclub.com").replace(/\/$/, "");
}

export function doorUrl(show: ShowRow): string {
  return `${siteUrl()}/ladies-night?door=${encodeURIComponent(show.door_code)}`;
}
