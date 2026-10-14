// lib/ln/share-data.ts
//
// What a series' link preview says about its current show. Falls back to
// the series itself when no show is scheduled (or the database can't be
// reached), so a shared link always has a preview.

import { serviceClient } from "../admin/staff-auth";
import { showColors } from "./theme";
import { getCurrentShow, publicArtist } from "./public-show";
import { getVenue } from "./venues";
import { DEFAULT_SERIES_SLUG, getClient, getSeriesBySlug } from "./series";
import type { ShareCardData } from "./share-card";

const GYAL_DEM = "Gyal Dem Social Club";
const FALLBACK_TITLE: Record<string, string> = { [DEFAULT_SERIES_SLUG]: "Ladies Night: An Ode To Her" };

export async function currentShareData(slug: string = DEFAULT_SERIES_SLUG): Promise<ShareCardData> {
  const fallback: ShareCardData = {
    title: FALLBACK_TITLE[slug] ?? "Ladies Night",
    artistName: null,
    djName: null,
    venueName: null,
    dateText: null,
    coverUrl: null,
    primary: null,
    accent: null,
    cta: "RSVP",
    ownerName: GYAL_DEM,
  };
  try {
    const db = serviceClient();
    const series = await getSeriesBySlug(db, slug);
    if (!series) return fallback;
    const client = await getClient(db, series.client_id).catch(() => null);
    const base = {
      ...fallback,
      ownerName: client?.active ? client.name : GYAL_DEM,
      title: series.name,
      coverUrl: series.cover_url,
      primary: series.primary_color,
      accent: series.accent_color,
      cta: series.feat_voting ? "RSVP · Vote the set list" : "RSVP",
    };
    const show = await getCurrentShow(db, series.id);
    if (!show) return base;
    const [artist, venue] = await Promise.all([
      series.feat_voting ? publicArtist(db, show.artist_id) : Promise.resolve(null),
      getVenue(db, show.venue_id),
    ]);
    const dateText = new Date(`${show.event_date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    return {
      ...base,
      title: series.feat_voting ? show.title : series.name,
      artistName: artist?.display_name ?? null,
      djName: show.dj_name,
      venueName: venue?.name ?? null,
      dateText,
      coverUrl: show.cover_url ?? artist?.cover_url ?? series.cover_url,
      ...(() => {
        const c = showColors(show, artist, series, series.feat_voting);
        return { primary: c.primary, accent: c.accent };
      })(),
    };
  } catch {
    return fallback;
  }
}
