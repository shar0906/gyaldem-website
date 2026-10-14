// app/ladies-night/an-ode-to-her/page.tsx
//
// An Ode To Her's guest page, at the address we share: RSVP, voting, VIP,
// table reservations, and the door QR. Same page as /ladies-night today.

import LadiesNightApp from "../LadiesNightApp";
import { odeMetadata, odeViewport } from "../../lib/ln/page-metadata";

export const revalidate = 600;
export const generateMetadata = odeMetadata;
export const viewport = odeViewport;

export default function AnOdeToHerPage() {
  return <LadiesNightApp />;
}
