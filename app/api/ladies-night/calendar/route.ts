// app/api/ladies-night/calendar/route.ts
//
// GET /api/ladies-night/calendar
// Public. "Add to calendar": a calendar file for the current show that
// Apple, Google, and Outlook calendars all open. Title includes the
// artist; location comes from the show's venue.

import { NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { getCurrentShow, publicArtist } from "../../../lib/ln/public-show";
import { easternToUtcIso } from "../../../lib/ln/dates";
import { getVenue } from "../../../lib/ln/venues";

export const dynamic = "force-dynamic";

function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Commas, semicolons, backslashes, and newlines must be escaped in .ics text.
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET() {
  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ error: "no_show" }, { status: 404 });

    const [artist, venue] = await Promise.all([publicArtist(db, show.artist_id), getVenue(db, show.venue_id)]);

    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gyaldemsocialclub.com").replace(/\/$/, "");
    const title = artist ? `${show.title} with ${artist.display_name}` : show.title;
    const location = venue?.name ?? "";
    const description = [show.gate_description, `${site}/ladies-night`].filter(Boolean).join("\n\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gyal Dem Social Club//Ladies Night//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:ladies-night-${show.id}@gyaldemsocialclub.com`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(easternToUtcIso(show.event_date, show.event_start_time))}`,
      `DTEND:${icsDate(easternToUtcIso(show.event_date, show.event_end_time))}`,
      `SUMMARY:${icsText(title)}`,
      `LOCATION:${icsText(location)}`,
      `DESCRIPTION:${icsText(description)}`,
      `URL:${site}/ladies-night`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="ladies-night-${show.event_date}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("calendar failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
