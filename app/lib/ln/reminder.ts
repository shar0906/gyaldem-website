// lib/ln/reminder.ts
//
// The automatic reminder email for each show, sent through Kit to the
// show's tag ("Ladies Night 2026-11-04"). On by default; 6 PM Eastern the
// evening before unless a time is set. Blank subject or message means the
// default template, filled in from the show.
//
// The hourly job hands each reminder to Kit within the week before it
// sends, then keeps Kit in step: edits update the scheduled email,
// turning it off cancels it.
//
// Env: KIT_API_KEY_V4 (Kit -> Settings -> Developer -> V4 keys). The V3
//      keys keep handling guest tagging.

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { easternToUtcIso, todayEastern } from "./dates";
import { getVenue } from "./venues";
import { publicArtist } from "./public-show";
import { siteUrl } from "./tonight";
import { DEFAULT_BODY, DEFAULT_SUBJECT, defaultSendAt } from "./reminder-template";

export { DEFAULT_BODY, DEFAULT_SUBJECT, defaultSendAt };

const KIT = "https://api.kit.com/v4";
const HAND_OFF_DAYS = 7;

export type ReminderShow = {
  id: string;
  event_date: string;
  event_start_time: string;
  archived: boolean;
  artist_id: string | null;
  venue_id: string | null;
  reminder_enabled: boolean;
  reminder_send_at: string | null;
  reminder_subject: string | null;
  reminder_body: string | null;
  reminder_broadcast_id: number | null;
  reminder_synced_hash: string | null;
};

export const REMINDER_COLUMNS =
  "id, event_date, event_start_time, archived, artist_id, venue_id, reminder_enabled, reminder_send_at, reminder_subject, reminder_body, reminder_broadcast_id, reminder_synced_hash";

export function sendAtFor(show: Pick<ReminderShow, "event_date" | "reminder_send_at">): string {
  return show.reminder_send_at ?? defaultSendAt(show.event_date);
}

export function showTagName(eventDate: string): string {
  return `Ladies Night ${eventDate}`;
}

export type Fill = { artist: string; date: string; time: string; venue: string; link: string };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function fillText(template: string, f: Fill): string {
  return template
    .replace(/\{artist\}/g, f.artist)
    .replace(/\{date\}/g, f.date)
    .replace(/\{time\}/g, f.time)
    .replace(/\{venue\}/g, f.venue)
    .replace(/\{link\}/g, f.link);
}

// Plain text with blank-line paragraphs -> simple email HTML. Kit's
// {{ subscriber... }} merge tags pass through untouched.
export function bodyToHtml(text: string, f: Fill): string {
  return fillText(text, f)
    .split(/\n\s*\n/)
    .map((para) => {
      const html = esc(para.trim()).replace(/\n/g, "<br>");
      const linked = html.split(esc(f.link)).join(`<a href="${esc(f.link)}">${esc(f.link)}</a>`);
      return `<p>${linked}</p>`;
    })
    .join("\n");
}

export type Action =
  | { kind: "none" }
  | { kind: "cancel" } // turned off, or show archived, while scheduled
  | { kind: "too_late" } // send time passed before it was ever scheduled
  | { kind: "wait" } // more than a week out
  | { kind: "schedule" } // create or update in Kit
  | { kind: "in_sync" };

// What to do with one show right now. Pure, so every case is testable.
export function decide(show: ReminderShow, now: Date, contentHash: string): Action {
  const sendAt = new Date(sendAtFor(show)).getTime();
  const t = now.getTime();
  const wanted = show.reminder_enabled && !show.archived;

  if (!wanted) return show.reminder_broadcast_id && sendAt > t ? { kind: "cancel" } : { kind: "none" };
  if (sendAt <= t) return show.reminder_broadcast_id ? { kind: "none" } : { kind: "too_late" };
  if (sendAt - t > HAND_OFF_DAYS * 86400 * 1000) return { kind: "wait" };
  if (show.reminder_broadcast_id && show.reminder_synced_hash === contentHash) return { kind: "in_sync" };
  return { kind: "schedule" };
}

export function hashOf(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

// ---------- Kit V4 ----------

function kitKey(): string | null {
  return process.env.KIT_API_KEY_V4 ?? null;
}

async function kit(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${KIT}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Kit-Api-Key": kitKey()!, ...(init.headers ?? {}) },
  });
  if (res.status === 204) return {};
  const text = await res.text();
  if (!res.ok) throw new Error(`Kit ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

export async function findTagId(name: string): Promise<number | null> {
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const q: string = `/tags?per_page=1000${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const data = (await kit(q)) as { tags?: { id: number; name: string }[]; pagination?: { has_next_page?: boolean; end_cursor?: string } };
    const hit = (data.tags ?? []).find((t) => t.name === name);
    if (hit) return hit.id;
    if (!data.pagination?.has_next_page || !data.pagination.end_cursor) return null;
    after = data.pagination.end_cursor;
  }
  return null;
}

function broadcastPayload(subject: string, html: string, sendAt: string, tagId: number) {
  return {
    subject,
    content: html,
    description: `Ladies Night reminder (${subject})`,
    public: false,
    send_at: sendAt,
    subscriber_filter: [{ all: [{ type: "tag", ids: [tagId] }], any: null, none: null }],
  };
}

// ---------- The hourly pass ----------

export async function processReminders(db: SupabaseClient, now = new Date()) {
  const result = { scheduled: 0, updated: 0, cancelled: 0, waiting: 0, problems: 0 };
  if (!kitKey()) return { ...result, skipped: "KIT_API_KEY_V4 is not set" };

  const yesterday = new Date(`${todayEastern(now)}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const { data: shows, error } = await db
    .from("ln_events")
    .select(REMINDER_COLUMNS)
    .gte("event_date", yesterday.toISOString().slice(0, 10))
    .returns<ReminderShow[]>();
  if (error) throw error;

  for (const show of shows ?? []) {
    const record = (fields: Record<string, unknown>) => db.from("ln_events").update(fields).eq("id", show.id);
    try {
      const [artist, venue] = await Promise.all([publicArtist(db, show.artist_id), getVenue(db, show.venue_id)]);
      const fill: Fill = {
        artist: artist?.display_name ?? "Tonight's artist",
        date: new Date(`${show.event_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
        time: new Date(easternToUtcIso(show.event_date, show.event_start_time)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }),
        venue: venue ? (venue.address ? `${venue.name}, ${venue.address}` : venue.name) : "the venue",
        link: `${siteUrl()}/ladies-night`,
      };
      const subject = fillText(show.reminder_subject || DEFAULT_SUBJECT, fill);
      const html = bodyToHtml(show.reminder_body || DEFAULT_BODY, fill);
      const sendAt = sendAtFor(show);
      const hash = hashOf([subject, html, sendAt, showTagName(show.event_date)]);

      const action = decide(show, now, hash);
      if (action.kind === "wait") result.waiting++;
      if (action.kind === "too_late") {
        await record({ reminder_error: "The send time passed before it could be scheduled." });
        result.problems++;
      }
      if (action.kind === "cancel") {
        await kit(`/broadcasts/${show.reminder_broadcast_id}`, { method: "DELETE" }).catch((e) => {
          if (!String(e).includes("404")) throw e;
        });
        await record({ reminder_broadcast_id: null, reminder_synced_hash: null, reminder_scheduled_at: null, reminder_error: null });
        result.cancelled++;
      }
      if (action.kind === "schedule") {
        const tagId = await findTagId(showTagName(show.event_date));
        if (!tagId) {
          await record({ reminder_error: "No guests are tagged for this show in Kit yet. It'll schedule once they are." });
          result.waiting++;
          continue;
        }
        const payload = broadcastPayload(subject, html, sendAt, tagId);
        if (show.reminder_broadcast_id) {
          await kit(`/broadcasts/${show.reminder_broadcast_id}`, { method: "PUT", body: JSON.stringify(payload) });
          await record({ reminder_synced_hash: hash, reminder_scheduled_at: new Date().toISOString(), reminder_error: null });
          result.updated++;
        } else {
          const created = (await kit("/broadcasts", { method: "POST", body: JSON.stringify(payload) })) as { broadcast?: { id?: number } };
          const id = created.broadcast?.id;
          if (!id) throw new Error("Kit didn't return a broadcast id");
          await record({ reminder_broadcast_id: id, reminder_synced_hash: hash, reminder_scheduled_at: new Date().toISOString(), reminder_error: null });
          result.scheduled++;
        }
      }
    } catch (err) {
      await record({ reminder_error: String((err as Error)?.message ?? err).slice(0, 300) });
      result.problems++;
    }
  }
  return result;
}
