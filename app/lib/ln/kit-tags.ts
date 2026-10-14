// lib/ln/kit-tags.ts
//
// Kit tag names, shared by guest tagging and the reminder email (which is
// sent to a show's tag).
//   "Ladies Night"                              everyone who's ever RSVP'd
//   "Ladies Night: Please! A Ladies Night"      that series' audience
//   "Ladies Night: Please! A Ladies Night 2026-10-29"   that show
// An Ode To Her keeps its original show tag ("Ladies Night 2026-11-04"),
// so guests tagged before series existed still get their reminder.

import { DEFAULT_SERIES_SLUG } from "./series";

export const ALL_TAG = "Ladies Night";

export function seriesTagName(seriesName: string): string {
  return `Ladies Night: ${seriesName}`;
}

export function showTagName(eventDate: string, series: { slug: string; name: string } | null): string {
  if (!series || series.slug === DEFAULT_SERIES_SLUG) return `Ladies Night ${eventDate}`;
  return `${seriesTagName(series.name)} ${eventDate}`;
}

export function artistTagName(artistName: string): string {
  return `Ladies Night artist: ${artistName}`;
}
