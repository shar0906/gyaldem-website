// admin/artist/ArtistResults.tsx
//
// The Results tab: final vote tallies for the artist's shows, unlocked
// once voting closes, plus guests who chose to share their contact info.

"use client";

import { useEffect, useState } from "react";
import { FAINT, GREEN, LINE, MUTED, RED, SOFT_RED, formatDateTime, formatShowDate, heading, label, primaryButton } from "./ui";

type ShowItem = { id: string; title: string; event_date: string; unlocked: boolean; unlocks_at: string };
type Song = { rank: number; song_id: string; title: string; artist: string; votes: number; share: number };
type Detail = {
  show: { id: string; title: string; event_date: string };
  totals: { voters: number; top_pick: string | null; sharing_with_you: number };
  songs: Song[];
  shared_guests: { name: string; email: string }[];
};

export default function ArtistResults() {
  const [shows, setShows] = useState<ShowItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(false);

  async function loadShows() {
    setError(false);
    try {
      const res = await fetch("/api/admin/ladies-night/my-results");
      if (!res.ok) throw new Error();
      const list: ShowItem[] = (await res.json()).shows ?? [];
      setShows(list);
      const firstUnlocked = list.find((s) => s.unlocked);
      setSelected((cur) => cur ?? firstUnlocked?.id ?? null);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    loadShows();
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetail(null);
      try {
        const res = await fetch(`/api/admin/ladies-night/my-results?event_id=${encodeURIComponent(selected)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setError(true);
      }
      if (!cancelled) setLoadingDetail(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (error) {
    return (
      <div style={{ padding: "32px 20px" }}>
        <p style={{ color: SOFT_RED, margin: "0 0 12px" }}>Couldn&apos;t load your results.</p>
        <button onClick={() => { setError(false); setShows(null); loadShows(); }} style={primaryButton()}>Try again</button>
      </div>
    );
  }
  if (!shows) return <p style={{ padding: "32px 20px", color: FAINT }}>Loading…</p>;

  const top = detail?.songs[0]?.votes ?? 0;

  return (
    <div style={{ padding: "24px 20px 48px" }}>
      <style>{`
        .ln-results{ display:grid; grid-template-columns:250px minmax(0,1fr); gap:28px; align-items:start; }
        .ln-results-row{ display:grid; grid-template-columns:36px minmax(0,1.4fr) minmax(0,1fr) 54px 64px; gap:12px; align-items:center; }
        @media (max-width: 800px){
          .ln-results{ grid-template-columns:1fr; }
          .ln-results-row{ grid-template-columns:28px minmax(0,1fr) 44px; }
          .ln-results-bar, .ln-results-share{ display:none; }
        }
      `}</style>
      <h1 style={heading}>Your results</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>What the audience picked for each of your shows. Results unlock when voting closes.</p>

      {shows.length === 0 ? (
        <p style={{ fontSize: 14, color: FAINT }}>No shows yet. Results show up here after your first show&apos;s voting closes.</p>
      ) : (
        <div className="ln-results">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shows.map((s) => {
              const active = s.id === selected;
              return (
                <button
                  key={s.id}
                  onClick={() => s.unlocked && setSelected(s.id)}
                  disabled={!s.unlocked}
                  aria-pressed={active}
                  style={{
                    textAlign: "left",
                    background: "transparent",
                    color: "white",
                    border: active ? `1px solid ${RED}` : "0.5px solid rgba(255,255,255,0.15)",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    cursor: s.unlocked ? "pointer" : "default",
                    fontFamily: "sans-serif",
                  }}
                >
                  <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 17 }}>{formatShowDate(s.event_date)}</span>
                  {s.unlocked ? (
                    <span style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: GREEN, border: `0.5px solid ${GREEN}`, padding: "3px 8px" }}>Final</span>
                  ) : (
                    <span style={{ fontSize: 12, color: MUTED }}>Unlocks {formatDateTime(s.unlocks_at)}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div>
            {!selected && <p style={{ fontSize: 14, color: FAINT }}>Results unlock once voting closes for your first show.</p>}
            {loadingDetail && <p style={{ fontSize: 14, color: FAINT }}>Loading…</p>}
            {detail && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <Stat name="Guests who voted" value={String(detail.totals.voters)} />
                  <Stat name="Top pick" value={detail.totals.top_pick ?? "None yet"} small />
                  <Stat name="Sharing with you" value={String(detail.totals.sharing_with_you)} />
                </div>

                {detail.songs.length === 0 ? (
                  <p style={{ fontSize: 14, color: FAINT }}>No votes were cast for this show.</p>
                ) : (
                  <div style={{ border: "0.5px solid rgba(255,255,255,0.15)" }}>
                    <div className="ln-results-row" style={{ padding: "11px 16px", borderBottom: LINE, fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: FAINT }}>
                      <span>Rank</span>
                      <span>Song</span>
                      <span className="ln-results-bar" />
                      <span style={{ textAlign: "right" }}>Votes</span>
                      <span className="ln-results-share" style={{ textAlign: "right" }}>Of voters</span>
                    </div>
                    {detail.songs.map((s) => (
                      <div key={s.song_id} className="ln-results-row" style={{ padding: "10px 16px", borderBottom: LINE }}>
                        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 16, color: s.rank <= 5 ? SOFT_RED : FAINT }}>{s.rank}</span>
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</span>
                          <span style={{ fontSize: 12, color: MUTED }}>{s.artist}</span>
                        </span>
                        <span className="ln-results-bar" style={{ height: 8, background: "rgba(255,255,255,0.08)" }}>
                          <span style={{ display: "block", height: "100%", width: `${top ? (s.votes / top) * 100 : 0}%`, background: s.rank <= 5 ? "#C81E3A" : "rgba(200,30,58,0.4)" }} />
                        </span>
                        <span style={{ textAlign: "right", fontSize: 15, fontWeight: 600 }}>{s.votes}</span>
                        <span className="ln-results-share" style={{ textAlign: "right", fontSize: 13, color: MUTED }}>{s.share}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <h2 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 22, margin: "0 0 4px" }}>Guests who shared their info with you</h2>
                      <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Only guests who checked the box to share. Everyone else stays private.</p>
                    </div>
                    {detail.shared_guests.length > 0 && (
                      <a
                        href={`/api/admin/ladies-night/my-results?event_id=${encodeURIComponent(detail.show.id)}&format=csv`}
                        style={{ ...primaryButton(), textDecoration: "none", display: "inline-block" }}
                      >
                        Export CSV
                      </a>
                    )}
                  </div>
                  {detail.shared_guests.length === 0 ? (
                    <p style={{ fontSize: 13, color: FAINT }}>No one opted in for this show.</p>
                  ) : (
                    <div style={{ border: "0.5px solid rgba(255,255,255,0.15)" }}>
                      {detail.shared_guests.map((g) => (
                        <div key={g.email} style={{ display: "flex", gap: 14, padding: "10px 16px", borderBottom: LINE, fontSize: 13, flexWrap: "wrap" }}>
                          <span style={{ minWidth: 180 }}>{g.name}</span>
                          <span style={{ color: MUTED }}>{g.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ name, value, small }: { name: string; value: string; small?: boolean }) {
  return (
    <div style={{ border: "0.5px solid rgba(255,255,255,0.15)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={label}>{name}</span>
      <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: small ? 20 : 28 }}>{value}</span>
    </div>
  );
}
