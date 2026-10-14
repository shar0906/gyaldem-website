// lib/ln/page-metadata.ts
//
// Share previews for a series page: title and description come from the
// series' current show (and artist, for voting series).

import type { Metadata, Viewport } from "next";
import { currentShareData } from "./share-data";
import { seriesPath } from "./series";
import { siteUrl } from "./site";

export async function seriesMetadata(slug: string): Promise<Metadata> {
  const d = await currentShareData(slug);
  const title = d.artistName ? `${d.title} with ${d.artistName}` : d.title;
  const where = d.venueName ? ` at ${d.venueName}` : "";
  const voting = d.cta.includes("Vote");
  const description = d.dateText
    ? `${d.dateText}${where}. ${voting ? "RSVP, vote the set list, and reserve your table." : "RSVP and reserve your table."}`
    : voting
      ? `RSVP, vote the artist's set list, and reserve your table for Ladies Night${where}.`
      : `RSVP for ${d.title}${where}.`;
  const url = `${siteUrl()}${seriesPath(slug)}`;
  return {
    // The series' owner (the client, or Gyal Dem) names the page.
    title: `${title} | ${d.ownerName}`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: d.ownerName, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const ladiesNightViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120D0E",
};
