// admin/ladies-night/ResultsSection.tsx
//
// Vote results per show: live while voting is open, final after. Plus
// the results email status and a Send / Resend button.

"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "../artist/ui";
import { FAINT, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, Stat, StageChip, api, button, errorText, showLabel, selectStyle } from "./kit";
import { useShows } from "./useShows";

type Song = { rank: number; song_id: string; title: string; artist: string; votes: number; share: number };
type Results = {
  show: { id: string; stage: string; voting_closes_at: string; artist_id: string | null; results_emailed_at: string | null; results_email_error: string | null };
  totals: { voters: number; rsvps: number; turnout: number | null; average_picks: number | null; voting_closes_at: string };
  songs: Song[];
};

const SEND_ERRORS: Record<string, string> = {
  voting_open: "Voting hasn't closed yet.",
  no_artist: "This show has no artist to send to.",
  not_configured: "Email isn't set up yet. Add the SMTP settings in Railway.",
};

export default function ResultsSection() {
  const { shows, selected, setSelected, error: listError } = useShows();
  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setData(null);
    const res = await api<Results>(`/api/admin/ladies-night/results?event_id=${id}`);
    if (!res.ok) setError(errorText(res.data as unknown as { error?: string }));
    else {
      setError(null);
      setData(res.data);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    setNotice(null);
    load(selected);
  }, [selected, load]);

  // Live: refresh every 15 seconds while voting is open.
  useEffect(() => {
    if (!selected || data?.show.stage !== "voting_open") return;
    const t = setInterval(() => load(selected, true), 15000);
    return () => clearInterval(t);
  }, [selected, data?.show.stage, load]);

  async function send() {
    if (!selected || !data) return;
    if (data.show.results_emailed_at && !confirm("Results were already emailed. Send them again?")) return;
    setSending(true);
    setNotice(null);
    const res = await api<{ error?: string; message?: string }>(`/api/admin/ladies-night/shows/${selected}/send-results`, { method: "POST" });
    setSending(false);
    if (!res.ok) {
      setNotice({ tone: "error", text: SEND_ERRORS[res.data.error ?? ""] ?? (res.data.error === "email_failed" ? `The email didn't send: ${res.data.message}` : errorText(res.data)) });
      return;
    }
    setNotice({ tone: "ok", text: "Results emailed to the artist, with hello@ copied." });
    load(selected, true);
  }

  if (listError) return <div><H1>Results</H1><Notice tone="error">{listError}</Notice></div>;
  if (!shows) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;
  if (!shows.length) return <div><H1>Results</H1><p style={{ fontSize: 14, color: MUTED }}>No shows yet.</p></div>;

  const top = data?.songs[0]?.votes ?? 0;
  const closed = data ? new Date(data.show.voting_closes_at).getTime() <= Date.now() : false;

  return (
    <div>
      <style>{`
        .ln-result-row{ display:grid; grid-template-columns:50px minmax(0,1.3fr) minmax(0,1fr) 80px 100px; gap:14px; align-items:center; padding:11px 20px; border-bottom:${LINE}; }
        @media (max-width: 760px){ .ln-result-row{ grid-template-columns:34px minmax(0,1fr) 54px; } .ln-result-bar, .ln-result-share{ display:none; } }
      `}</style>
      <H1 action={selected ? <a href={`/api/admin/ladies-night/results?event_id=${selected}&format=csv`} style={button("primary")}>Export results (CSV)</a> : null}>Results</H1>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <label htmlFor="r-show" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Show</label>
        <select id="r-show" value={selected ?? ""} onChange={(e) => setSelected(e.target.value)} style={{ ...selectStyle, height: 40, width: "auto", minWidth: 240 }}>
          {shows.map((s) => <option key={s.id} value={s.id}>{showLabel(s)}</option>)}
        </select>
        {data && <StageChip stage={data.show.stage} />}
        {data?.show.stage === "voting_open" && <span style={{ fontSize: 12, color: MUTED }}>Live: updates every 15 seconds</span>}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>}
      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
            <Stat name="Guests who voted" value={data.totals.voters} />
            <Stat name="Of RSVPs" value={data.totals.turnout === null ? "None yet" : `${data.totals.turnout}%`} />
            <Stat name="Average picks" value={data.totals.average_picks ?? "None yet"} />
            <Stat name={closed ? "Voting closed" : "Voting closes"} value={<span style={{ fontSize: 20 }}>{formatDateTime(data.totals.voting_closes_at)}</span>} />
          </div>

          <div style={{ ...PANEL, padding: "14px 20px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED }}>Results email</span>
              <span style={{ fontSize: 14 }}>
                {data.show.results_emailed_at ? (
                  <span style={{ color: GREEN }}>Sent {formatDateTime(data.show.results_emailed_at)} to the artist, cc hello@</span>
                ) : data.show.results_email_error ? (
                  <span style={{ color: RED }}>Last try failed: {data.show.results_email_error}</span>
                ) : closed ? (
                  "Goes out automatically within the hour."
                ) : (
                  "Sends automatically within an hour of voting closing."
                )}
              </span>
            </div>
            <button onClick={send} disabled={!closed || sending || !data.show.artist_id} style={button("secondary", closed && !sending && !!data.show.artist_id)}>
              {sending ? "Sending…" : data.show.results_emailed_at ? "Resend" : "Send now"}
            </button>
          </div>
          {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}

          <div style={PANEL}>
            <div className="ln-result-row" style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>
              <span>Rank</span><span>Song</span><span className="ln-result-bar" /><span style={{ textAlign: "right" }}>Votes</span><span className="ln-result-share" style={{ textAlign: "right" }}>Of voters</span>
            </div>
            {data.songs.length === 0 && <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>No published ballot yet.</p>}
            {data.songs.map((s) => (
              <div key={s.song_id} className="ln-result-row">
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, color: s.rank <= 5 ? RED : FAINT }}>{s.rank}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{s.artist}</span>
                </span>
                <span className="ln-result-bar" style={{ height: 10, background: "#EFE8DC" }}>
                  <span style={{ display: "block", height: "100%", width: `${top ? (s.votes / top) * 100 : 0}%`, background: s.rank <= 5 ? RED : "rgba(139,26,26,0.35)" }} />
                </span>
                <span style={{ textAlign: "right", fontSize: 15, fontWeight: 600 }}>{s.votes}</span>
                <span className="ln-result-share" style={{ textAlign: "right", fontSize: 13, color: MUTED }}>{s.share}%</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "12px 0 0" }}>Artists see their results once voting closes. Guests never see vote counts.</p>
        </>
      )}
    </div>
  );
}
