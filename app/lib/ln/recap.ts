// lib/ln/recap.ts
//
// The recap for one show: how many RSVP'd, tables booked, check-ins, VIP passes and revenue, live
// page visits, and the winners. Shown in admin, and emailed after the
// show to the series' client (cc the Gyal Dem record inbox), or just to
// the record inbox for Gyal Dem's own series.

import type { SupabaseClient } from "@supabase/supabase-js";
import { RECORD_EMAIL } from "./results-email";
import { sendMail } from "./mailer";
import { getClient, getSeriesById, seriesPath } from "./series";
import { getVenue } from "./venues";
import { siteUrl } from "./site";
import { SHOW_COLUMNS, ShowRow } from "./shows";

export type Recap = {
  rsvps: number;
  tables: number;
  checked_in: number;
  vip_passes: number;
  vip_revenue_cents: number;
  live_views: number;
  winners: string[];
};

export async function showRecap(db: SupabaseClient, show: Pick<ShowRow, "id" | "live_views">): Promise<Recap> {
  const [rsvpRes, vipRes, winnersRes] = await Promise.all([
    db.from("ln_rsvps").select("table_reserved_at, checked_in_at").eq("event_id", show.id),
    db.from("ln_vip_orders").select("quantity, amount_cents").eq("event_id", show.id).eq("status", "paid"),
    db
      .from("ln_live_posts")
      .select("body")
      .eq("event_id", show.id)
      .eq("kind", "winner")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
  ]);
  if (rsvpRes.error || vipRes.error || winnersRes.error) throw rsvpRes.error ?? vipRes.error ?? winnersRes.error;
  const rsvps = rsvpRes.data ?? [];
  return {
    rsvps: rsvps.length,
    tables: rsvps.filter((r) => r.table_reserved_at).length,
    checked_in: rsvps.filter((r) => r.checked_in_at).length,
    vip_passes: (vipRes.data ?? []).reduce((n, o) => n + (o.quantity as number), 0),
    vip_revenue_cents: (vipRes.data ?? []).reduce((n, o) => n + (o.amount_cents as number), 0),
    live_views: show.live_views ?? 0,
    winners: (winnersRes.data ?? []).map((w) => w.body as string),
  };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function buildRecapEmail(opts: {
  seriesName: string;
  eventDate: string;
  venueName: string | null;
  themeName: string | null;
  recap: Recap;
  features: { vip: boolean; door: boolean; opentable: boolean; live: boolean };
  pageLink: string;
}) {
  const { seriesName, eventDate, venueName, themeName, recap, features, pageLink } = opts;
  const date = new Date(`${eventDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const subject = `Recap: ${seriesName}, ${date}`;
  const rows: [string, string][] = [["RSVPs", String(recap.rsvps)]];
  if (features.opentable) rows.push(["Tables booked", String(recap.tables)]);
  if (features.door) rows.push(["Checked in at the door", String(recap.checked_in)]);
  if (features.vip) rows.push(["VIP passes sold", `${recap.vip_passes}${recap.vip_passes ? ` (${money(recap.vip_revenue_cents)})` : ""}`]);
  if (features.live) rows.push(["Live page visits", String(recap.live_views)]);

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #EBD9CE;color:#6B4B4F">${esc(k)}</td><td style="padding:10px 12px;border-bottom:1px solid #EBD9CE;text-align:right"><b>${esc(v)}</b></td></tr>`
    )
    .join("");
  const winners = recap.winners.length
    ? `<p style="margin:22px 0 6px;font-family:Georgia,serif;font-style:italic;font-size:18px">Winners</p>${recap.winners.map((w) => `<p style="margin:0 0 4px">${esc(w)}</p>`).join("")}`
    : "";
  const sub = [date, venueName, themeName].filter(Boolean).join(" · ");

  const html = `<!doctype html><html><body style="margin:0;background:#F5F0E8;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#0A0A0A">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8B1A1A">${esc(seriesName)}</p>
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:28px">The night in numbers</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4A4640">${esc(sub)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#FBF3EC;color:#2A0E12;font-size:15px">${table}</table>
    ${winners}
    <p style="margin:22px 0 0"><a href="${esc(pageLink)}" style="display:inline-block;background:#8B1A1A;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:12px;letter-spacing:.12em;text-transform:uppercase">See the series page</a></p>
    <p style="margin:26px 0 0;font-size:12px;color:#7A746C">Sent by Gyal Dem Social Club the day after the show.</p>
  </div></body></html>`;
  const text = [`${seriesName}: the night in numbers`, sub, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(recap.winners.length ? ["", "Winners", ...recap.winners] : []), "", pageLink].join("\n");
  return { subject, html, text };
}

// Sends one show's recap, then records the outcome.
export async function sendShowRecap(db: SupabaseClient, showId: string): Promise<"sent"> {
  const { data: show, error } = await db.from("ln_events").select(SHOW_COLUMNS).eq("id", showId).maybeSingle<ShowRow>();
  if (error) throw error;
  if (!show) throw new Error("show_not_found");
  const series = await getSeriesById(db, show.series_id);
  if (!series) throw new Error("series_not_found");
  const [client, venue, recap] = await Promise.all([getClient(db, series.client_id), getVenue(db, show.venue_id), showRecap(db, show)]);

  const email = buildRecapEmail({
    seriesName: series.name,
    eventDate: show.event_date,
    venueName: venue?.name ?? null,
    themeName: show.theme_name,
    recap,
    features: {
      vip: series.feat_vip,
      door: series.feat_door,
      opentable: series.feat_opentable,
      live: series.feat_live,
    },
    pageLink: `${siteUrl()}${seriesPath(series.slug)}`,
  });

  const to = client?.active && client.contact_email ? [client.contact_email] : [RECORD_EMAIL];
  const cc = to[0] === RECORD_EMAIL ? undefined : [RECORD_EMAIL];
  try {
    await sendMail({ to, cc, ...email });
  } catch (err) {
    await db.from("ln_events").update({ recap_email_error: String((err as Error)?.message ?? err).slice(0, 500) }).eq("id", showId);
    throw err;
  }
  await db.from("ln_events").update({ recap_emailed_at: new Date().toISOString(), recap_email_error: null }).eq("id", showId);
  return "sent";
}
