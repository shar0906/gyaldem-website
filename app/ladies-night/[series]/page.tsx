// app/ladies-night/[series]/page.tsx
//
// A series' guest page, e.g. /ladies-night/an-ode-to-her or
// /ladies-night/please: RSVP, the parts the series has switched on
// (voting, VIP, OpenTable, door check-in), and the live view on
// show night.
//
// Share previews: title and description come from the series' current
// show; the preview image is opengraph-image.tsx in this folder.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LadiesNightApp from "../LadiesNightApp";
import { ladiesNightViewport, seriesMetadata } from "../../lib/ln/page-metadata";
import { getSeriesBySlug, SLUG } from "../../lib/ln/series";
import { serviceClient } from "../../lib/admin/staff-auth";
import { getCurrentShow, publicArtist } from "../../lib/ln/public-show";
import { showColors } from "../../lib/ln/theme";

export const revalidate = 600;
export const viewport = ladiesNightViewport;

type Props = { params: Promise<{ series: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  return seriesMetadata(series);
}

export default async function SeriesPage({ params }: Props) {
  const { series } = await params;
  if (!SLUG.test(series)) notFound();
  const db = serviceClient();
  const row = await getSeriesBySlug(db, series).catch(() => null);
  if (!row) notFound();
  // What the page shows while it loads: the series' loader in the next
  // show's colors, and the curtain intro on Gyal Dem's own series.
  const show = await getCurrentShow(db, row.id).catch(() => null);
  const artist = show && row.feat_voting ? await publicArtist(db, show.artist_id).catch(() => null) : null;
  const colors = showColors(show, artist, row, row.feat_voting);
  const title = show?.gate_headline || (row.feat_voting && show ? show.title : row.name);
  return (
    <LadiesNightApp
      series={series}
      loading={{ kind: row.loader ?? "record", title: row.name, primary: colors.primary, accent: colors.accent }}
      curtainTitle={row.client_id ? null : title}
    />
  );
}
