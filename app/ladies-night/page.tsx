// app/ladies-night/page.tsx
//
// The public Ladies Night page: RSVP, People's Choice voting, VIP, table
// reservations, and the door QR on show night.
//
// Share previews: title and description come from the current show and
// artist; the preview image is opengraph-image.tsx in this folder.

import type { Metadata, Viewport } from "next";
import LadiesNightApp from "./LadiesNightApp";
import { currentShareData } from "../lib/ln/share-data";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const d = await currentShareData();
  const title = d.artistName ? `${d.title} with ${d.artistName}` : d.title;
  const where = d.venueName ? ` at ${d.venueName}` : "";
  const description = d.dateText
    ? `${d.dateText}${where}. RSVP, vote the set list, and reserve your table.`
    : `RSVP, vote the artist's set list, and reserve your table for Ladies Night${where}.`;
  return {
    title: `${title} | Gyal Dem Social Club`,
    description,
    openGraph: {
      title,
      description,
      url: "https://gyaldemsocialclub.com/ladies-night",
      siteName: "Gyal Dem Social Club",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120D0E",
};

export default function LadiesNightPage() {
  return <LadiesNightApp />;
}
