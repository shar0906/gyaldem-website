// The link-preview image for /ladies-night. Rebuilt at most every 10
// minutes, so a new show or new cover photo shows up on its own.

import { SHARE_SIZE, renderShareCard } from "../lib/ln/share-card";
import { currentShareData } from "../lib/ln/share-data";

export const runtime = "nodejs";
export const revalidate = 600;
export const alt = "Ladies Night at Brooklyn Chop House, hosted by Gyal Dem Social Club";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderShareCard(await currentShareData());
}
