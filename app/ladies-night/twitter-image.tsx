// Same card for X / Twitter previews.

import { SHARE_SIZE, renderShareCard } from "../lib/ln/share-card";
import { currentShareData } from "../lib/ln/share-data";

export const runtime = "nodejs";
export const revalidate = 600;
export const alt = "Ladies Night, hosted by Gyal Dem Social Club";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderShareCard(await currentShareData());
}
