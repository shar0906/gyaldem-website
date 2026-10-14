// app/ladies-night/page.tsx
//
// The public Ladies Night page: RSVP, People's Choice voting, VIP, table
// reservations, and the door QR on show night. The same page also lives
// at /ladies-night/an-ode-to-her, the address we share; this one keeps old
// links working until it becomes the page listing every series.
//
// Share previews: title and description come from the current show and
// artist; the preview image is opengraph-image.tsx in this folder.

import LadiesNightApp from "./LadiesNightApp";
import { odeMetadata, odeViewport } from "../lib/ln/page-metadata";

export const revalidate = 600;
export const generateMetadata = odeMetadata;
export const viewport = odeViewport;

export default function LadiesNightPage() {
  return <LadiesNightApp />;
}
