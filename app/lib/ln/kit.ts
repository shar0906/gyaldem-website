// lib/ln/kit.ts
//
// Sends queued Ladies Night guests to Kit (formerly ConvertKit), using
// the same v3 API the site's newsletter signup already uses. Each guest
// gets three tags, so you can email exactly the right people:
//   "Ladies Night"                     everyone who's ever RSVP'd
//   "Ladies Night 2026-11-14"          everyone for that show (the
//                                      day-before reminder goes here)
//   "Ladies Night artist: Kay"         that artist's audience
//
// Env: KIT_API_KEY (already set for the newsletter), KIT_API_SECRET
//      (Kit -> Settings -> Advanced -> API; needed to create new tags).

import type { SupabaseClient } from "@supabase/supabase-js";

const KIT = "https://api.convertkit.com/v3";
const MAX_ATTEMPTS = 8;
const tagIds = new Map<string, number>();

function keys() {
  const apiKey = process.env.KIT_API_KEY || process.env.kit_api_key;
  const apiSecret = process.env.KIT_API_SECRET || process.env.kit_api_secret;
  return { apiKey, apiSecret };
}

async function kitFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${KIT}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Kit ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function tagId(name: string): Promise<number> {
  const cached = tagIds.get(name);
  if (cached) return cached;

  const { apiKey, apiSecret } = keys();
  const list = (await kitFetch(`/tags?api_key=${encodeURIComponent(apiKey!)}`)) as {
    tags?: { id: number; name: string }[];
  };
  for (const t of list.tags ?? []) tagIds.set(t.name, t.id);
  const found = tagIds.get(name);
  if (found) return found;

  if (!apiSecret) throw new Error(`Kit tag "${name}" doesn't exist and KIT_API_SECRET isn't set to create it`);
  const created = (await kitFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ api_secret: apiSecret, tag: { name } }),
  })) as { id?: number; tag?: { id: number } };
  const id = created.id ?? created.tag?.id;
  if (!id) throw new Error(`Kit didn't return an id for new tag "${name}"`);
  tagIds.set(name, id);
  return id;
}

async function tagSubscriber(name: string, email: string, firstName: string | null) {
  const { apiKey } = keys();
  const id = await tagId(name);
  await kitFetch(`/tags/${id}/subscribe`, {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey, email, first_name: firstName ?? undefined }),
  });
}

type QueueRow = {
  id: number;
  attempts: number;
  ln_voters: { email: string; first_name: string | null; name: string } | null;
  ln_events: { event_date: string; ln_artists: { display_name: string } | null } | null;
};

// Processes up to `limit` due rows. Claims them first so two overlapping
// runs never send the same guest twice.
export async function processKitQueue(db: SupabaseClient, limit = 25) {
  const { apiKey } = keys();
  if (!apiKey) throw new Error("KIT_API_KEY is missing");

  const now = new Date();
  const { data: due, error } = await db
    .from("ln_kit_queue")
    .select("id")
    .eq("status", "pending")
    .lte("next_attempt_at", now.toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  if (!due?.length) return { sent: 0, retrying: 0, failed: 0 };

  const claimUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const { data: claimed, error: claimError } = await db
    .from("ln_kit_queue")
    .update({ next_attempt_at: claimUntil })
    .in("id", due.map((d) => d.id))
    .eq("status", "pending")
    .lte("next_attempt_at", now.toISOString())
    .select("id, attempts, ln_voters(email, first_name, name), ln_events(event_date, ln_artists(display_name))")
    .returns<QueueRow[]>();
  if (claimError) throw claimError;

  let sent = 0;
  let retrying = 0;
  let failed = 0;
  for (const row of claimed ?? []) {
    try {
      const voter = row.ln_voters;
      const show = row.ln_events;
      if (!voter || !show) throw new Error("guest or show no longer exists");
      const first = voter.first_name ?? voter.name.split(" ")[0] ?? null;

      const tags = ["Ladies Night", `Ladies Night ${show.event_date}`];
      if (show.ln_artists?.display_name) tags.push(`Ladies Night artist: ${show.ln_artists.display_name}`);
      for (const tag of tags) await tagSubscriber(tag, voter.email, first);

      await db.from("ln_kit_queue").update({ status: "done", last_error: null }).eq("id", row.id);
      sent++;
    } catch (err) {
      const attempts = row.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      // Waits 2, 4, 8... minutes between tries, up to about 4 hours.
      const wait = Math.min(2 ** attempts, 256) * 60 * 1000;
      await db
        .from("ln_kit_queue")
        .update({
          attempts,
          status: giveUp ? "failed" : "pending",
          last_error: String((err as Error)?.message ?? err).slice(0, 500),
          next_attempt_at: new Date(Date.now() + wait).toISOString(),
        })
        .eq("id", row.id);
      if (giveUp) failed++;
      else retrying++;
    }
  }
  return { sent, retrying, failed };
}
