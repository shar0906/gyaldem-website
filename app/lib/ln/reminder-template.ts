// lib/ln/reminder-template.ts
//
// The default reminder email, and its default send time. Safe to use in
// the browser (the admin editor shows these as starting text).
// {artist} {date} {time} {venue} {link} fill in from the show; Kit's own
// {{ subscriber.first_name }} merge tag passes through to Kit.

import { easternToUtcIso } from "./dates";

export const DEFAULT_SUBJECT = "Tomorrow: Ladies Night with {artist}";
export const DEFAULT_BODY = `Hi {{ subscriber.first_name | default: "there" }},

Ladies Night is tomorrow, {date}, at {venue}. Doors open at {time}.

{artist} takes the stage, singing the set you all voted for.

Your RSVP is in, but it doesn't hold a table. If you haven't booked yours yet, reserve through OpenTable to guarantee your seat: {link}

See you there,
Gyal Dem Social Club`;

// 6 PM Eastern the day before the show.
export function defaultSendAt(eventDate: string): string {
  const d = new Date(`${eventDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return easternToUtcIso(d.toISOString().slice(0, 10), "18:00");
}
