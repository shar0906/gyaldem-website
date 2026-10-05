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

// Offset (local minus UTC, in ms) of Eastern time at a given instant.
function easternOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOW_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - utcMs;
}

// "2026-11-14" + "18:00" in Eastern time -> UTC ISO string. Handles
// daylight-saving changes.
export function easternToUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wallAsUtc - easternOffsetMs(wallAsUtc);
  const second = wallAsUtc - easternOffsetMs(utc);
  if (second !== utc) utc = second;
  return new Date(utc).toISOString();
}
