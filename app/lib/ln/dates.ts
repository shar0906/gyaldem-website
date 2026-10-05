// lib/ln/dates.ts
//
// Show dates are stored as calendar dates in Eastern time (Miami). Using
// the server's clock directly would flip "today" at 8 PM Eastern, since
// Railway runs in UTC.

export const SHOW_TIME_ZONE = "America/New_York";

// "YYYY-MM-DD" for today in Eastern time.
export function todayEastern(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
