// app/api/ladies-night/calendar/route.ts
//
// GET /api/ladies-night/calendar?series=<slug>
// Public. "Add to calendar": a calendar file for the series' current show
// that Apple, Google, and Outlook calendars all open.
//   - Title: the show, with the artist (or DJ) when there is one.
//   - Location: "Venue, full address", so calendar apps show the venue
//     name and can open the address in Maps.
//   - Notes: the show description, the series page, and the live page.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { publicArtist } from "../../../lib/ln/public-show";
import { easternToUtcIso } from "../../../lib/ln/dates";
import { getVenue, venueLocation } from "../../../lib/ln/venues";
import { livePath, seriesPath } from "../../../lib/ln/series";
import { loadSeriesShow } from "../../../lib/ln/public-guard";
import { siteUrl } from "../../../lib/ln/site";

export const dynamic = "force-dynamic";

function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Commas, semicolons, backslashes, and newlines must be escaped in .ics text.
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

// .ics lines over 75 bytes are folded with a leading space.
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function GET(req: NextRequest) {
  const db = serviceClient();
  try {
    const loaded = await loadSeriesShow(db, req.nextUrl.searchParams.get("series"));
    if (!loaded.ok) return NextResponse.json({ error: "no_show" }, { status: 404 });
    const { show, series } = loaded;

    const [artist, venue] = await Promise.all([
      series.feat_voting ? publicArtist(db, show.artist_id) : Promise.resolve(null),
      getVenue(db, show.venue_id),
    ]);

    // A night that ends at or after midnight ends the next day.
    const startIso = easternToUtcIso(show.event_date, show.event_start_time);
    let endIso = easternToUtcIso(show.event_date, show.event_end_time);
    if (endIso <= startIso) {
      const next = new Date(`${show.event_date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      endIso = easternToUtcIso(next.toISOString().slice(0, 10), show.event_end_time);
    }

    const site = siteUrl();
    const page = `${site}${seriesPath(series.slug)}`;
    const live = `${site}${livePath(series.slug)}`;
    const title = artist ? `${show.title} with ${artist.display_name}` : show.dj_name ? `${show.title} · Music by ${show.dj_name}` : show.title;
    const location = venueLocation(venue) ?? "";
    const description = [
      show.gate_description,
      `Your RSVP and table: ${page}`,
      series.feat_live ? `On the night, follow along live: ${live}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gyal Dem Social Club//Ladies Night//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:ladies-night-${show.id}@gyaldemsocialclub.com`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(startIso)}`,
      `DTEND:${icsDate(endIso)}`,
      `SUMMARY:${icsText(title)}`,
      `LOCATION:${icsText(location)}`,
      `DESCRIPTION:${icsText(description)}`,
      `URL:${page}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ];
    const ics = lines.map(fold).join("\r\n");

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${series.slug}-${show.event_date}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("calendar failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
