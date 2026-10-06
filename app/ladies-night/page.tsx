// app/ladies-night/page.tsx
//
// The public Ladies Night page: RSVP, People's Choice voting, VIP, table
// reservations, and the door QR on show night.

import type { Metadata, Viewport } from "next";
import LadiesNightApp from "./LadiesNightApp";

export const metadata: Metadata = {
  title: "Ladies Night: An Ode To Her | Gyal Dem Social Club",
  description: "RSVP, vote the artist's set list, and reserve your table for Ladies Night at Brooklyn Chop House.",
  openGraph: {
    title: "Ladies Night: An Ode To Her",
    description: "RSVP, vote the set list, and reserve your table at Brooklyn Chop House.",
    url: "https://gyaldemsocialclub.com/ladies-night",
    siteName: "Gyal Dem Social Club",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120D0E",
};

export default function LadiesNightPage() {
  return <LadiesNightApp />;
}
