// The link-preview image for the Ladies Night hub.

import { SHARE_SIZE, renderShareCard } from "../lib/ln/share-card";

export const runtime = "nodejs";
export const alt = "Ladies Night, hosted by Gyal Dem Social Club";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderShareCard({
    title: "Ladies Night",
    artistName: null,
    djName: null,
    venueName: null,
    dateText: "Nights for the girls, across the city",
    coverUrl: null,
    primary: null,
    accent: null,
    cta: "Pick your night",
  });
}
