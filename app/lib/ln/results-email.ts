// lib/ln/results-email.ts
//
// The results email: to the show's artist, cc hello@ for the record.
// Top 10 songs with vote counts, plus a link to the full results.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMail } from "./mailer";
import { siteUrl } from "./tonight";

export const RECORD_EMAIL = process.env.RESULTS_RECORD_EMAIL ?? "hello@gyaldemsocialclub.com";
const TOP = 10;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function prettyDate(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Result = { title: string; artist: string; votes: number };

export function buildResultsEmail(opts: {
  showTitle: string;
  eventDate: string;
  artistName: string;
  voters: number;
  songs: Result[];
  link: string;
}) {
  const { showTitle, eventDate, artistName, voters, songs, link } = opts;
  const top = songs.slice(0, TOP);
  const date = prettyDate(eventDate);
  const subject = `People's Choice results: ${artistName}, ${date}`;
  const more = songs.length > TOP ? `See all ${songs.length} songs` : "See the full results";

  const rows = top
    .map(
      (s, i) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EBD9CE;font-family:Georgia,serif;font-style:italic;color:#8B1A1A;width:28px">${i + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EBD9CE"><b>${esc(s.title)}</b><br><span style="color:#6B4B4F;font-size:13px">${esc(s.artist)}</span></td>
        <td style="padding:10px 12px;border-bottom:1px solid #EBD9CE;text-align:right;white-space:nowrap"><b>${s.votes}</b> vote${s.votes === 1 ? "" : "s"}</td>
      </tr>`
    )
    .join("");

  const body = voters
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#FBF3EC;color:#2A0E12;font-size:15px">${rows}</table>`
    : `<p style="margin:0;color:#2A0E12">No votes were cast for this show.</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F5F0E8;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#0A0A0A">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8B1A1A">${esc(showTitle)}</p>
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:28px">People's Choice results</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4A4640">${esc(artistName)} · ${esc(date)} · ${voters} guest${voters === 1 ? "" : "s"} voted</p>
    ${body}
    <p style="margin:22px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#8B1A1A;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:12px;letter-spacing:.12em;text-transform:uppercase">${more}</a></p>
    <p style="margin:26px 0 0;font-size:12px;color:#7A746C">Sent by Gyal Dem Social Club when voting closed.</p>
  </div></body></html>`;

  const text = [
    `People's Choice results`,
    `${showTitle}`,
    `${artistName} · ${date} · ${voters} guest${voters === 1 ? "" : "s"} voted`,
    "",
    ...(voters ? top.map((s, i) => `${i + 1}. ${s.title} (${s.artist}): ${s.votes} vote${s.votes === 1 ? "" : "s"}`) : ["No votes were cast for this show."]),
    "",
    `${more}: ${link}`,
  ].join("\n");

  return { subject, html, text };
}

// Builds and sends one show's results email, then records the outcome.
// Returns "sent", or "skipped" when there's no artist to send to.
export async function sendShowResults(db: SupabaseClient, showId: string): Promise<"sent" | "skipped"> {
  const { data: show, error } = await db
    .from("ln_events")
    .select("id, title, event_date, artist_id, ln_artists(display_name, staff_email)")
    .eq("id", showId)
    .maybeSingle<{
      id: string;
      title: string;
      event_date: string;
      artist_id: string | null;
      ln_artists: { display_name: string; staff_email: string } | null;
    }>();
  if (error) throw error;
  if (!show) throw new Error("show_not_found");
  if (!show.ln_artists) return "skipped";

  const [resultsRes, ballotsRes, orderRes] = await Promise.all([
    db.from("ln_results").select("song_id, title, artist, votes").eq("event_id", showId),
    db.from("ln_ballots").select("voter_id", { count: "exact", head: true }).eq("event_id", showId),
    db.from("ln_event_songs").select("song_id, sort_order").eq("event_id", showId),
  ]);
  if (resultsRes.error || ballotsRes.error || orderRes.error) throw resultsRes.error ?? ballotsRes.error ?? orderRes.error;

  const order = new Map((orderRes.data ?? []).map((r) => [r.song_id, r.sort_order as number]));
  const songs = (resultsRes.data ?? [])
    .map((r) => ({ song_id: r.song_id as string, title: r.title as string, artist: r.artist as string, votes: (r.votes as number) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || (order.get(a.song_id) ?? 0) - (order.get(b.song_id) ?? 0));

  const email = buildResultsEmail({
    showTitle: show.title,
    eventDate: show.event_date,
    artistName: show.ln_artists.display_name,
    voters: ballotsRes.count ?? 0,
    songs,
    link: `${siteUrl()}/admin`,
  });

  try {
    await sendMail({ to: [show.ln_artists.staff_email], cc: [RECORD_EMAIL], ...email });
  } catch (err) {
    await db
      .from("ln_events")
      .update({ results_email_error: String((err as Error)?.message ?? err).slice(0, 500) })
      .eq("id", showId);
    throw err;
  }

  await db.from("ln_events").update({ results_emailed_at: new Date().toISOString(), results_email_error: null }).eq("id", showId);
  return "sent";
}
