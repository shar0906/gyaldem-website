// admin/ladies-night/GuestsSection.tsx
//
// Everyone RSVP'd to a show: how they arrived, voted, table, VIP,
// sharing, and check-in. Exports the RSVP list and the VIP wristband list.

"use client";

import { useEffect, useMemo, useState } from "react";
import { FAINT, H1, LINE, MUTED, Notice, PANEL, RED, Stat, api, button, errorText, inputStyle, showLabel } from "./kit";
import { useShows } from "./useShows";

type Guest = {
  rsvp_id: string;
  name: string;
  email: string;
  source: "gate" | "door_qr" | "door_manual";
  rsvp_at: string;
  voted: boolean;
  table_reserved: boolean;
  table_via_opentable?: boolean;
  table_party_size?: number | null;
  table_time?: string | null;
  table_confirmation?: string | null;
  vip_passes: number;
  share_with_artist: boolean;
  checked_in_at: string | null;
};
type Summary = { rsvps: number; voted: number; tables_reserved: number; vip_passes_sold: number; sharing_with_artist: number; checked_in: number };

const SOURCE: Record<Guest["source"], string> = { gate: "Gate", door_qr: "Door QR", door_manual: "Door, typed in" };

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export default function GuestsSection() {
  const { shows, selected, setSelected, error: listError } = useShows();
  const [data, setData] = useState<{ summary: Summary; guests: Guest[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!selected) return;
    setData(null);
    setError(null);
    api<{ summary: Summary; guests: Guest[] }>(`/api/admin/ladies-night/guests?event_id=${selected}`).then((res) => {
      if (!res.ok) setError(errorText(res.data as { error?: string }));
      else setData(res.data);
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data) return [];
    return q ? data.guests.filter((g) => g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)) : data.guests;
  }, [data, query]);

  if (listError) return <div><H1>Guests</H1><Notice tone="error">{listError}</Notice></div>;
  if (!shows) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;
  if (!shows.length) return <div><H1>Guests</H1><p style={{ fontSize: 14, color: MUTED }}>No shows yet.</p></div>;

  const exportBase = `/api/admin/ladies-night/guests?event_id=${selected}&format=csv`;

  return (
    <div>
      <style>{`
        .ln-guest-row{ display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1.4fr) 110px 60px 80px 60px 90px 90px; gap:12px; align-items:center; padding:11px 20px; border-bottom:${LINE}; font-size:13px; }
        .ln-m{ display:none; color:rgba(10,10,10,0.5); font-size:11px; margin-right:6px; }
        @media (max-width: 1000px){
          .ln-guest-row{ grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
          .ln-guest-head{ display:none !important; }
          .ln-m{ display:inline; }
          .ln-guest-row > :nth-child(1), .ln-guest-row > :nth-child(2){ grid-column:1 / -1; }
        }
      `}</style>
      <H1
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`${exportBase}&list=vip`} style={button("secondary")}>Export VIP list</a>
            <a href={`${exportBase}&list=rsvps`} style={button("primary")}>Export RSVPs (CSV)</a>
          </div>
        }
      >
        Guests
      </H1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <label htmlFor="g-show" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Show</label>
        <select id="g-show" value={selected ?? ""} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 240 }}>
          {shows.map((s) => <option key={s.id} value={s.id}>{showLabel(s)}</option>)}
        </select>
        <label htmlFor="g-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search guests</label>
        <input id="g-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" style={{ ...inputStyle, width: "auto", minWidth: 240 }} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>}
      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            <Stat name="RSVPs" value={data.summary.rsvps} />
            <Stat name="Voted" value={data.summary.voted} />
            <Stat name="Tables reserved" value={data.summary.tables_reserved} note="Booked here or self-reported" />
            <Stat name="VIP passes sold" value={data.summary.vip_passes_sold} />
            <Stat name="Sharing with artist" value={data.summary.sharing_with_artist} />
            <Stat name="Checked in" value={data.summary.checked_in} />
          </div>
          <div style={PANEL}>
            <div className="ln-guest-row ln-guest-head" style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>
              <span>Name</span><span>Email</span><span>Arrived via</span><span>Voted</span><span>Table</span><span>VIP</span><span>Shares</span><span>Checked in</span>
            </div>
            {filtered.length === 0 && <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>{data.guests.length ? "No guests match that search." : "No RSVPs yet."}</p>}
            {filtered.map((g) => (
              <div key={g.rsvp_id} className="ln-guest-row">
                <span style={{ fontWeight: 600 }}>{g.name}</span>
                <span style={{ color: MUTED, overflowWrap: "anywhere" }}>{g.email}</span>
                <span><span className="ln-m">Arrived</span>{SOURCE[g.source]}</span>
                <span style={{ color: g.voted ? undefined : FAINT }}><span className="ln-m">Voted</span>{g.voted ? "Yes" : "No"}</span>
                <span style={{ color: g.table_reserved ? undefined : FAINT }}><span className="ln-m">Table</span>{g.table_reserved ? (g.table_party_size ? `Party of ${g.table_party_size}${g.table_time ? ` · ${new Date(`2000-01-01T${g.table_time}:00Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}` : ""}` : "Reserved") : "Not yet"}</span>
                <span style={{ color: g.vip_passes ? RED : FAINT }}><span className="ln-m">VIP</span>{g.vip_passes ? `× ${g.vip_passes}` : "None"}</span>
                <span style={{ color: g.share_with_artist ? undefined : FAINT }}><span className="ln-m">Shares</span>{g.share_with_artist ? "Yes" : "No"}</span>
                <span style={{ color: g.checked_in_at ? undefined : FAINT }}><span className="ln-m">Checked in</span>{g.checked_in_at ? time(g.checked_in_at) : "Not yet"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
