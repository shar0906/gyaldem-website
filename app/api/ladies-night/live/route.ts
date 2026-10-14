// app/api/ladies-night/live/route.ts
//
// GET /api/ladies-night/live?series=<slug>
// Public, no sign-in (the table QR). The live page for a series:
//   - show night: tonight's show, before the host taps We're live, live,
//     or wrapped up
//   - between shows: the last show's recap (winners, updates, gallery),
//     plus the next show's date
// The page refreshes this every few seconds.
//
//   200 { series, show, live, next }
//   show and live are null when the series has never had a show.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { getCurrentShow, getLastShow, guestStage } from "../../../lib/ln/public-show";
import { getClient, publicSeries } from "../../../lib/ln/series";
import { loadSeries } from "../../../lib/ln/public-guard";
import { publicLive } from "../../../lib/ln/live";
import { getVenue, publicVenue } from "../../../lib/ln/venues";
import { todayEastern } from "../../../lib/ln/dates";
import { SHOW_COLUMNS, ShowRow } from "../../../lib/ln/shows";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const db = serviceClient();
  try {
    const loaded = await loadSeries(db, req.nextUrl.searchParams.get("series"));
    if (!loaded.ok) return loaded.response;
    const { series } = loaded;

    const [client, upcoming, last] = await Promise.all([
      getClient(db, series.client_id),
      getCurrentShow(db, series.id),
      getLastShow(db, series.id),
    ]);

    // Tonight's show if there is one; otherwise the last show's recap,
    // or the next show if there's never been one.
    const tonight = upcoming && upcoming.event_date === todayEastern() ? upcoming : null;
    const show = tonight ?? last ?? upcoming;
    let next = tonight ? null : upcoming;
    if (tonight) {
      // After tonight: the series' following show, for the recap countdown.
      const { data } = await db
        .from("ln_events")
        .select(SHOW_COLUMNS)
        .eq("series_id", series.id)
        .eq("archived", false)
        .gt("event_date", tonight.event_date)
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle<ShowRow>();
      next = data ?? null;
    }

    const venue = show ? await getVenue(db, show.venue_id) : null;
    const live = show ? await publicLive(db, show, series.call_delay_seconds) : null;
    // A next show that hasn't happened yet always reads "before".
    if (live && show && show === upcoming && !tonight) live.state = "before";

    return NextResponse.json(
      {
        series: publicSeries(series, client),
        show: show
          ? {
              id: show.id,
              title: show.title,
              event_date: show.event_date,
              event_start_time: show.event_start_time,
              theme_name: show.theme_name,
              dj_name: show.dj_name,
              venue: publicVenue(venue),
            }
          : null,
        live,
        next: next
          ? {
              event_date: next.event_date,
              event_start_time: next.event_start_time,
              theme_name: next.theme_name,
              rsvp_open: guestStage(next, series.feat_voting) !== "coming_soon",
              rsvp_opens_at: next.rsvp_opens_at,
            }
          : null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("live page failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
