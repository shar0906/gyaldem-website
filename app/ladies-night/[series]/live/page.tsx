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
import { getSeriesBySlug, SLUG } from "../../../lib/ln/series";
import { serviceClient } from "../../../lib/admin/staff-auth";

export const dynamic = "force-dynamic";
export const viewport = ladiesNightViewport;

type Props = { params: Promise<{ series: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const row = SLUG.test(series) ? await getSeriesBySlug(serviceClient(), series).catch(() => null) : null;
  const name = row?.name ?? "Ladies Night";
  return { title: `${name}: Live | Gyal Dem Social Club`, description: `Live updates, bingo calls, and winners from ${name}.` };
}

export default async function SeriesLivePage({ params }: Props) {
  const { series } = await params;
  if (!SLUG.test(series)) notFound();
  const row = await getSeriesBySlug(serviceClient(), series).catch(() => null);
  if (!row) notFound();
  return <LivePage slug={series} primary={row.primary_color} accent={row.accent_color} />;
}
