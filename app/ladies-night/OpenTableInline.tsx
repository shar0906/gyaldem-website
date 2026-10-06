// ladies-night/OpenTableInline.tsx
//
// OpenTable's own booking page, shown inside the "Save your seat" card so
// guests book without leaving /ladies-night. When a booking completes,
// OpenTable's page tells this page ("reservation-made", with the
// confirmation number, party size, and time). The message is trusted
// only when it really comes from opentable.com and is for this venue's
// restaurant; a booking for another date is flagged instead of counted.

"use client";

import { useEffect, useMemo } from "react";
import { GOLD } from "./shared";

export type OpenTableBooking = {
  confirmationNumber: number | string;
  partySize: number;
  restaurantId: number;
  reservationDateTime: string; // "2026-11-04T19:30", restaurant local time
};

function bookingUrls(saved: string, dateTime: string): { embed: string; open: string; rid: string | null } {
  try {
    const u = new URL(saved);
    const rid = u.searchParams.get("rid");
    // The widget loader is only a search box; for inline booking, use
    // OpenTable's full booking page for the same restaurant, opened on the
    // show's date and start time.
    if (u.pathname.startsWith("/widget/") && rid) {
      const page = `https://www.opentable.com/restref/client/?rid=${encodeURIComponent(rid)}&restref=${encodeURIComponent(rid)}&datetime=${encodeURIComponent(dateTime)}&lang=en-US&ot_source=Restaurant%20website`;
      return { embed: page, open: page, rid };
    }
    if (u.pathname.startsWith("/restref/") && !u.searchParams.has("datetime")) u.searchParams.set("datetime", dateTime);
    return { embed: u.toString(), open: u.toString(), rid };
  } catch {
    return { embed: saved, open: saved, rid: null };
  }
}

export default function OpenTableInline({
  url,
  eventDate,
  startTime,
  onBooked,
  onWrongDate,
}: {
  url: string;
  eventDate: string;
  startTime: string; // "18:00:00"
  onBooked: (b: OpenTableBooking) => void;
  onWrongDate: (b: OpenTableBooking) => void;
}) {
  const { embed, open, rid } = useMemo(() => bookingUrls(url, `${eventDate}T${startTime.slice(0, 5)}`), [url, eventDate, startTime]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== "https://www.opentable.com") return;
      const d = e.data as { source?: string; type?: string; payload?: Partial<OpenTableBooking> } | null;
      if (!d || d.source !== "opentable-events" || d.type !== "reservation-made" || !d.payload) return;
      const p = d.payload;
      if (p.confirmationNumber == null || typeof p.partySize !== "number" || typeof p.reservationDateTime !== "string") return;
      if (rid && p.restaurantId != null && String(p.restaurantId) !== rid) return;
      const booking = p as OpenTableBooking;
      if (booking.reservationDateTime.slice(0, 10) !== eventDate) onWrongDate(booking);
      else onBooked(booking);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [rid, eventDate, onBooked, onWrongDate]);

  return (
    <div>
      <iframe
        src={embed}
        title="Reserve your table on OpenTable"
        style={{ width: "100%", height: "min(720px, 78dvh)", border: 0, borderRadius: 10, background: "#ffffff", display: "block" }}
        allow="payment"
      />
      <a href={open} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", color: GOLD, fontSize: 13, padding: "10px 0 0" }}>
        Trouble booking here? Open OpenTable instead
      </a>
    </div>
  );
}
