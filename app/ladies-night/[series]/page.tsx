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
  const row = await getSeriesBySlug(serviceClient(), series).catch(() => null);
  if (!row) notFound();
  return <LadiesNightApp series={series} />;
}
