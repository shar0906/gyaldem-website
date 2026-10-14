// lib/ln/page-metadata.ts
//
// Share previews for the An Ode To Her guest page: title and description
// come from the current show and artist. Used by /ladies-night and
// /ladies-night/ode-to-her, which show the same page.

import type { Metadata, Viewport } from "next";
import { currentShareData } from "./share-data";
import { ODE_PATH } from "./paths";

export async function odeMetadata(): Promise<Metadata> {
  const d = await currentShareData();
  const title = d.artistName ? `${d.title} with ${d.artistName}` : d.title;
  const where = d.venueName ? ` at ${d.venueName}` : "";
  const description = d.dateText
    ? `${d.dateText}${where}. RSVP, vote the set list, and reserve your table.`
    : `RSVP, vote the artist's set list, and reserve your table for Ladies Night${where}.`;
  const url = `https://gyaldemsocialclub.com${ODE_PATH}`;
  return {
    title: `${title} | Gyal Dem Social Club`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Gyal Dem Social Club", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const odeViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120D0E",
};
