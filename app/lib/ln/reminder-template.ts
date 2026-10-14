// lib/ln/reminder-template.ts
//
// The default reminder emails, and the default send time. Safe to use in
// the browser (the admin editor shows these as starting text).
// {series} {artist} {dj} {date} {time} {venue} {link} {live} fill in from
// the show; Kit's own {{ subscriber.first_name }} merge tag passes through.
//
// Two defaults: one for series with an artist and People's Choice voting
// (An Ode To Her), one for hosted nights (Please! A Ladies Night).

import { easternToUtcIso } from "./dates";

export const DEFAULT_SUBJECT = "Tomorrow: Ladies Night with {artist}";
export const DEFAULT_BODY = `Hi {{ subscriber.first_name | default: "there" }},

Ladies Night is tomorrow, {date}, at {venue}. Doors open at {time}.

{artist} takes the stage, singing the set you all voted for.

Your RSVP is in, but it doesn't hold a table. If you haven't booked yours yet, reserve through OpenTable to guarantee your seat: {link}

On the night, follow along live (announcements, bingo calls, and winners): {live}

See you there,
Gyal Dem Social Club`;

export const DEFAULT_SUBJECT_HOSTED = "Tomorrow: {series}";
export const DEFAULT_BODY_HOSTED = `Hi {{ subscriber.first_name | default: "there" }},

{series} is tomorrow, {date}, at {venue}. Doors open at {time}.

Your RSVP is in, but it doesn't hold a table. If you haven't booked yours yet, reserve through OpenTable to guarantee your seat: {link}

On the night, follow along live (announcements, bingo calls, and winners): {live}

See you there,
Gyal Dem Social Club`;

export function defaultTemplate(featVoting: boolean): { subject: string; body: string } {
  return featVoting
    ? { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY }
    : { subject: DEFAULT_SUBJECT_HOSTED, body: DEFAULT_BODY_HOSTED };
}

// 6 PM Eastern the day before the show.
export function defaultSendAt(eventDate: string): string {
  const d = new Date(`${eventDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return easternToUtcIso(d.toISOString().slice(0, 10), "18:00");
}
