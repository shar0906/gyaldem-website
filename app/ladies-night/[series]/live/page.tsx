// app/ladies-night/[series]/live/page.tsx
//
// The live page for a series, from the table QR: host announcements,
// bingo calls, winners, and tonight's running order. No sign-in. One
// permanent link per series: it always shows tonight's show, or the last
// one's recap between shows.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import LivePage from "./LivePage";
import { ladiesNightViewport } from "../../../lib/ln/page-metadata";
import { getClient, getSeriesBySlug, SLUG } from "../../../lib/ln/series";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { getCurrentShow, publicArtist } from "../../../lib/ln/public-show";
import { showColors } from "../../../lib/ln/theme";

export const dynamic = "force-dynamic";
export const viewport = ladiesNightViewport;

type Props = { params: Promise<{ series: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const db = serviceClient();
  const row = SLUG.test(series) ? await getSeriesBySlug(db, series).catch(() => null) : null;
  const name = row?.name ?? "Ladies Night";
  const client = row ? await getClient(db, row.client_id).catch(() => null) : null;
  const owner = client?.active ? client.name : "Gyal Dem Social Club";
  return { title: `${name}: Live | ${owner}`, description: `Live updates, bingo calls, and winners from ${name}.` };
}

export default async function SeriesLivePage({ params }: Props) {
  const { series } = await params;
  if (!SLUG.test(series)) notFound();
  const row = await getSeriesBySlug(serviceClient(), series).catch(() => null);
  if (!row) notFound();
  const db = serviceClient();
  const show = await getCurrentShow(db, row.id).catch(() => null);
  const artist = show && row.feat_voting ? await publicArtist(db, show.artist_id).catch(() => null) : null;
  const colors = showColors(show, artist, row, row.feat_voting);
  return <LivePage slug={series} primary={colors.primary} accent={colors.accent} />;
}
