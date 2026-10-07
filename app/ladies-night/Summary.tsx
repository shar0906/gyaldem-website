// ladies-night/Summary.tsx
//
// Where every path lands: the reserve-your-table step, "You're all set,"
// and the remembered-device welcome back, depending on what the guest
// has already done. Chips show only what's true for them. Add to Calendar
// is always here.

"use client";

import { useState } from "react";
import OpenTableInline, { OpenTableBooking } from "./OpenTableInline";
import {
  CREAM,
  CalendarIcon,
  CheckIcon,
  Chip,
  ErrorText,
  Footer,
  GOLD,
  Glow,
  Guest,
  INK,
  OpenCurrent,
  SANS,
  SERIF,
  V,
  card,
  cta,
  errorFor,
  eyebrow,
  h1,
  outlineButton,
  post,
  prettyDate,
  prettyTime,
  sub,
  tableTime,
  textLink,
} from "./shared";

export default function Summary({
  current,
  guest,
  welcome,
  notice,
  onGuest,
  onChangePicks,
  onVip,
  onNotYou,
}: {
  current: OpenCurrent;
  guest: Guest;
  welcome: boolean;
  notice: { ok: boolean; text: string } | null;
  onGuest: (g: Guest) => void;
  onChangePicks: () => void;
  onVip: () => void;
  onNotYou: () => void;
}) {
  const { show, artist, songs, vip, stage } = current;
  const reserved = !!guest.rsvp?.table_reserved;
  const passes = guest.rsvp?.vip_passes ?? 0;
  const [showReserve, setShowReserve] = useState(!reserved);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongDate, setWrongDate] = useState<OpenTableBooking | null>(null);

  const vipAvailable = vip.enabled && !vip.closed && !vip.sold_out && passes < 5;
  const titleById = new Map(songs.map((s) => [s.song_id, s]));
  const picks = guest.picks.map((id) => titleById.get(id)).filter(Boolean) as typeof songs;

  // OpenTable reported a booking from inside the frame: save it and move on.
  async function bookedOnOpenTable(b: OpenTableBooking) {
    setWrongDate(null);
    setBusy(true);
    const res = await post<{ guest: Guest }>("/api/ladies-night/table", {
      source: "opentable",
      confirmation_number: b.confirmationNumber,
      party_size: b.partySize,
      reservation_datetime: b.reservationDateTime,
    });
    setBusy(false);
    if (!res.ok) return setError("Your table is booked with OpenTable, but we couldn't save it here. Tap “I've reserved my table” below.");
    onGuest(res.data.guest);
    setShowReserve(false);
    setWidgetOpen(false);
  }

  async function markReserved() {
    setBusy(true);
    setError(null);
    const res = await post<{ guest: Guest }>("/api/ladies-night/table");
    setBusy(false);
    if (!res.ok) return setError(errorFor(res.data));
    onGuest(res.data.guest);
    setShowReserve(false);
    setWidgetOpen(false);
  }

  const heading = reserved
    ? <>{welcome ? `Welcome back, ${guest.first_name}.` : `You're all set, ${guest.first_name}.`}<span style={{ display: "block", color: V.accentSoft }}>{welcome ? "You're all set." : "See you there."}</span></>
    : welcome
      ? <>Welcome back, {guest.first_name}.</>
      : <>You&apos;re on the list, {guest.first_name}.</>;

  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 440, margin: "0 auto", boxSizing: "border-box", padding: "24px 16px calc(26px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 18, color: CREAM, fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 6px", minHeight: 44 }}>
        <span style={eyebrow}>{show.title}</span>
        {welcome && <button onClick={onNotYou} style={{ ...textLink, flex: "none" }}>Not you?</button>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 6px" }}>
        <h1 style={h1}>{heading}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip>RSVP&apos;d</Chip>
          {guest.voted && <Chip>Voted</Chip>}
          {reserved && (
            <Chip>
              {guest.rsvp?.table?.party_size
                ? `Table for ${guest.rsvp.table.party_size}${tableTime(guest.rsvp.table.reserved_for) ? ` · ${tableTime(guest.rsvp.table.reserved_for)}` : ""}`
                : "Table booked"}
            </Chip>
          )}
          {passes > 0 && <Chip>VIP × {passes}</Chip>}
        </div>
        {notice && (
          <p role="status" style={{ margin: 0, fontSize: 14, color: notice.ok ? GOLD : "#FFC9CF" }}>{notice.text}</p>
        )}
      </div>

      {showReserve && (
        <section style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Reserve your table">
          <Glow />
          <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD }}>Save your seat</span>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 24, lineHeight: 1.15 }}>Reserve through OpenTable to guarantee your seat.</h2>
          <p style={{ ...sub, fontSize: 13.5 }}>Your RSVP doesn&apos;t guarantee a table. Book the Ladies Night reservation{current.venue ? ` at ${current.venue.name}` : ""} to lock yours in.</p>
          {wrongDate && (
            <p role="alert" style={{ margin: 0, fontSize: 13.5, color: "#FFC9CF" }}>
              That booking is for {new Date(`${wrongDate.reservationDateTime.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}, not the show on {prettyDate(show.event_date)}. Book again for show night, and cancel the other one from your OpenTable confirmation.
            </p>
          )}
          {show.opentable_url ? (
            widgetOpen ? (
              <OpenTableInline url={show.opentable_url} eventDate={show.event_date} startTime={show.event_start_time} onBooked={bookedOnOpenTable} onWrongDate={setWrongDate} />
            ) : (
              <button onClick={() => setWidgetOpen(true)} style={{ ...cta(), marginTop: 6 }}>Reserve on OpenTable →</button>
            )
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: GOLD }}>Reservations open soon. Check back here.</p>
          )}
          <button onClick={markReserved} disabled={busy} style={{ ...outlineButton, marginTop: 6 }}>
            <CheckIcon /> {busy ? "Saving…" : "I've reserved my table"}
          </button>
          {error && <ErrorText>{error}</ErrorText>}
        </section>
      )}

      {picks.length > 0 && (
        <section aria-label="Your picks" style={{ background: CREAM, color: INK, borderRadius: 14, padding: "14px 16px 6px", boxShadow: "0 10px 22px -14px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
            <b style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17 }}>Your picks</b>
            <span style={{ background: V.accent, color: CREAM, fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 999 }}>{picks.length} {picks.length === 1 ? "pick" : "picks"}</span>
          </div>
          {picks.map((s) => (
            <div key={s.song_id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid #EBD9CE", fontSize: 14 }}>
              <span style={{ fontWeight: 700 }}>{s.title}</span>
              <span style={{ color: "#6B4B4F", textAlign: "right" }}>{s.artist}</span>
            </div>
          ))}
        </section>
      )}
      {stage === "voting_open" && guest.voted && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -8 }}>
          <button onClick={onChangePicks} style={textLink}>Change my picks</button>
          <span style={{ fontSize: 12, color: "rgba(251,243,236,0.65)" }}>You can change them until voting closes.</span>
        </div>
      )}

      {stage === "voting_closed" && (
        <p style={{ margin: guest.voted ? "-8px 0 0" : 0, textAlign: "center", fontSize: 13, color: "rgba(251,243,236,0.7)" }}>
          {guest.voted ? "Voting has closed. Your picks are locked in." : "People's Choice voting has closed for this show."}
        </p>
      )}

      <section aria-label="Show details" style={{ background: CREAM, color: INK, borderRadius: 14, padding: "4px 16px" }}>
        {[
          ["When", `${prettyDate(show.event_date)} · ${prettyTime(show.event_start_time)}`],
          ...(current.venue ? [["Where", current.venue.name]] : []),
          ...(artist ? [["Artist", artist.display_name]] : []),
          ...(guest.rsvp?.table ? [["OpenTable confirmation", `#${guest.rsvp.table.confirmation}`]] : []),
        ].map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: i ? "1px solid #EBD9CE" : "none", fontSize: 14 }}>
            <span style={{ color: "#6B4B4F" }}>{k}</span>
            { k === "Where" && current.venue ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [current.venue.name, current.venue.address].filter(Boolean).join(", ")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${current.venue.name} in Google Maps`}
                style={{ fontWeight: 700, textAlign: "right", color: INK, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9A9A0" }}
              >
                {v} ↗
              </a>
            ) : (
              <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
            )}
          </div>
        ))}
      </section>

      {vipAvailable && (
        <button onClick={onVip} style={{ ...outlineButton, borderColor: `${GOLD}99`, color: GOLD }}>
          {passes ? "Add VIP passes →" : "Make it VIP →"}
        </button>
      )}

      <a href="/api/ladies-night/calendar" style={reserved ? { ...cta(), display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } : { ...outlineButton, background: CREAM, color: INK, border: "none" }}>
        <CalendarIcon color={reserved ? CREAM : INK} /> Add to calendar
      </a>
      {reserved && !showReserve && (
        <button onClick={() => setShowReserve(true)} style={textLink}>Still need your table?</button>
      )}
      <div style={{ flex: 1 }} />
      <Footer venue={current.venue} artist={artist} />
    </main>
  );
}
