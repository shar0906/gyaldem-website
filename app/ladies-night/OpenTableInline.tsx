// ladies-night/OpenTableInline.tsx
//
// OpenTable's booking page in a sheet over /ladies-night: full-height on
// phones, a large centered window on desktop. OpenTable gets the room its
// page is built for, and guests never leave our page.
//
// It opens already set to the show's date, start time, and the party size
// the guest picked in the reserve card. When a booking completes,
// OpenTable's page tells this page ("reservation-made", with the
// confirmation number, party size, and time). The message is trusted only
// when it really comes from opentable.com and is for this venue's
// restaurant; a booking for another date is flagged instead of counted.

"use client";

import { useEffect, useMemo, useRef } from "react";
import { CREAM, SANS, SERIF, V } from "./shared";

export type OpenTableBooking = {
  confirmationNumber: number | string;
  partySize: number;
  restaurantId: number;
  reservationDateTime: string; // "2026-11-04T19:30", restaurant local time
};

export function bookingUrls(saved: string, dateTime: string, covers: number): { embed: string; rid: string | null } {
  try {
    const u = new URL(saved);
    const rid = u.searchParams.get("rid");
    // The widget loader is only a search box; for booking, use OpenTable's
    // full booking page for the same restaurant.
    if (u.pathname.startsWith("/widget/") && rid) {
      const p = new URLSearchParams({ rid, restref: rid, datetime: dateTime, covers: String(covers), lang: "en-US", ot_source: "Restaurant website" });
      return { embed: `https://www.opentable.com/restref/client/?${p.toString()}`, rid };
    }
    if (u.pathname.startsWith("/restref/")) {
      if (!u.searchParams.has("datetime")) u.searchParams.set("datetime", dateTime);
      u.searchParams.set("covers", String(covers));
    }
    return { embed: u.toString(), rid };
  } catch {
    return { embed: saved, rid: null };
  }
}

export default function OpenTableSheet({
  url,
  eventDate,
  startTime,
  partySize,
  subtitle,
  onClose,
  onBooked,
  onWrongDate,
}: {
  url: string;
  eventDate: string;
  startTime: string; // "18:00:00"
  partySize: number;
  subtitle: string;
  onClose: () => void;
  onBooked: (b: OpenTableBooking) => void;
  onWrongDate: (b: OpenTableBooking) => void;
}) {
  const { embed, rid } = useMemo(
    () => bookingUrls(url, `${eventDate}T${startTime.slice(0, 5)}`, partySize),
    [url, eventDate, startTime, partySize]
  );
  const closeRef = useRef<HTMLButtonElement>(null);

  // OpenTable's booking confirmation.
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

  // While open: the page behind doesn't scroll, Escape closes, and focus
  // starts on the close button (and returns where it was afterward).
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="ln-sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`
        .ln-sheet-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(10,5,6,0.72); display: flex; align-items: flex-end; justify-content: center; animation: ln-fade .2s ease-out; }
        .ln-sheet { width: 100%; height: calc(100dvh - 24px); background: #ffffff; border-radius: 18px 18px 0 0; overflow: hidden; display: flex; flex-direction: column; animation: ln-rise .28s cubic-bezier(.2,.8,.2,1); box-shadow: 0 -20px 60px rgba(0,0,0,0.5); }
        @media (min-width: 700px) {
          .ln-sheet-backdrop { align-items: center; padding: 24px; }
          .ln-sheet { width: min(640px, 100%); height: min(880px, calc(100dvh - 48px)); border-radius: 18px; }
        }
        @keyframes ln-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ln-rise { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .ln-sheet, .ln-sheet-backdrop { animation: none; } }
      `}</style>
      <div className="ln-sheet" role="dialog" aria-modal="true" aria-label="Reserve your table">
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 12px 18px", background: `linear-gradient(160deg, ${V.primary}, ${V.deep})`, color: CREAM, fontFamily: SANS }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 19 }}>Reserve your table</span>
            <span style={{ fontSize: 12, color: "rgba(251,243,236,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            style={{ flex: "none", width: 44, height: 44, borderRadius: 999, border: "1px solid rgba(251,243,236,0.3)", background: "transparent", color: CREAM, fontSize: 20, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        <iframe src={embed} title="OpenTable booking" style={{ flex: 1, width: "100%", border: 0, display: "block", background: "#ffffff" }} allow="payment" />
        <a
          href={embed}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: "none", display: "block", textAlign: "center", padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", fontSize: 13, color: "#6B4B4F", background: "#FBF3EC", borderTop: "1px solid #EBD9CE", fontFamily: SANS }}
        >
          Trouble booking here? Open OpenTable instead ↗
        </a>
      </div>
    </div>
  );
}

