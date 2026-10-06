// lib/ln/share-data.ts
//
// What the link preview says about the current show. Falls back to the
// series itself when no show is scheduled (or the database can't be
// reached), so a shared link always has a preview.

import { serviceClient } from "../admin/staff-auth";
import { getCurrentShow, publicArtist } from "./public-show";
import { getVenue } from "./venues";
import type { ShareCardData } from "./share-card";

export async function currentShareData(): Promise<ShareCardData> {
  try {
    const db = serviceClient();
    const show = await getCurrentShow(db);
    if (!show) throw new Error("no show");
    const [artist, venue] = await Promise.all([publicArtist(db, show.artist_id), getVenue(db, show.venue_id)]);
    const dateText = new Date(`${show.event_date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    return {
      title: show.title,
      artistName: artist?.display_name ?? null,
      venueName: venue?.name ?? null,
      dateText,
      coverUrl: artist?.cover_url ?? null,
      primary: artist?.primary_color ?? null,
      accent: artist?.accent_color ?? null,
    };
  } catch {
    return { title: "Ladies Night: An Ode To Her", artistName: null, venueName: null, dateText: null, coverUrl: null, primary: null, accent: null };
  }
}
