// The link-preview image for a series page. Rebuilt at most every 10
// minutes, so a new show or new cover photo shows up on its own.

import { SHARE_SIZE, renderShareCard } from "../../lib/ln/share-card";
import { currentShareData } from "../../lib/ln/share-data";

export const runtime = "nodejs";
export const revalidate = 600;
export const alt = "Ladies Night: the next show";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params;
  return renderShareCard(await currentShareData(series));
}
