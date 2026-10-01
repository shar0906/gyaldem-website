// ArtistPropose.tsx
//
// Full-screen, three-column layout: Your Repertoire (left, reusable
// across events) | Search (center) | Your List for this proposal
// (right). Submit button is fixed to the bottom of the screen at all
// times. On narrow screens the three columns stack into blocks and the
// page scrolls normally, but the submit button stays fixed.
//
// Untested draft — not run inside your repo yet.

"use client";

import { useState, useEffect } from "react";

const MIN_SONGS_TO_PROPOSE = 10;
const CATEGORIES = ["80s", "90s", "2000s", "jazz"] as const;
type Category = typeof CATEGORIES[number];

type SearchResult = {
  apple_track_id: number;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  apple_music_url: string | null;
  suggested_category: Category | null;
};

type RepertoireItem = {
  id: string;
  title: string;
  artist: string;
  category: Category | null;
  artwork_url: string | null;
  apple_track_id: number | null;
};

type WorkingSong = {
  key: string; // "rep-<id>" | "<apple_track_id>" | "manual-<n>"
  repertoire_id: string | null;
  title: string;
  artist: string;
  category: Category | null;
  artwork_url: string | null;
  apple_track_id: number | null;
  apple_music_url: string | null;
};

type AlreadyProposed = {
  song_id: string;
  status: "draft" | "published";
  ln_repertoire: { title: string; artist: string; category: string | null; artwork_url: string | null };
};

export default function ArtistPropose({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [alreadyProposed, setAlreadyProposed] = useState<AlreadyProposed[]>([]);
  const [loading, setLoading] = useState(true);

  const [repertoire, setRepertoire] = useState<RepertoireItem[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [working, setWorking] = useState<WorkingSong[]>([]);

  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [manualCategory, setManualCategory] = useState<Category>("jazz");
  const [showManual, setShowManual] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const loadEvent = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ladies-night/my-event");
    if (res.ok) {
      const data = await res.json();
      setEventId(data.event?.id ?? null);
      setEventTitle(data.event?.title ?? null);
      setEventDate(data.event?.event_date ?? null);
      setAlreadyProposed(data.mySongs ?? []);
    }
    setLoading(false);
  };

  const loadRepertoire = async () => {
    const res = await fetch("/api/admin/ladies-night/my-repertoire");
    if (res.ok) {
      const data = await res.json();
      setRepertoire(data.repertoire ?? []);
    }
  };

  useEffect(() => { loadEvent(); loadRepertoire(); }, []);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const res = await fetch(`/api/admin/ladies-night/search?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results ?? []);
    }
    setSearching(false);
  };

  // Live search as you type — waits 350ms after the last keystroke
  // before actually calling the API.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => { runSearch(); }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const addFromSearch = (song: SearchResult) => {
    const key = String(song.apple_track_id);
    if (working.some((w) => w.key === key)) return;
    setWorking((prev) => [...prev, {
      key,
      repertoire_id: null,
      title: song.title,
      artist: song.artist,
      category: song.suggested_category,
      artwork_url: song.artwork_url,
      apple_track_id: song.apple_track_id,
      apple_music_url: song.apple_music_url,
    }]);
  };

  const addFromRepertoire = (item: RepertoireItem) => {
    const key = `rep-${item.id}`;
    if (working.some((w) => w.key === key)) return;
    setWorking((prev) => [...prev, {
      key,
      repertoire_id: item.id,
      title: item.title,
      artist: item.artist,
      category: item.category,
      artwork_url: item.artwork_url,
      apple_track_id: item.apple_track_id,
      apple_music_url: null,
    }]);
  };

  const addManual = () => {
    if (!manualTitle.trim() || !manualArtist.trim()) return;
    const key = `manual-${Date.now()}`;
    setWorking((prev) => [...prev, {
      key,
      repertoire_id: null,
      title: manualTitle.trim(),
      artist: manualArtist.trim(),
      category: manualCategory,
      artwork_url: null,
      apple_track_id: null,
      apple_music_url: null,
    }]);
    setManualTitle("");
    setManualArtist("");
  };

  const removeFromWorking = (key: string) => {
    setWorking((prev) => prev.filter((w) => w.key !== key));
  };

  const updateCategory = (key: string, category: Category) => {
    setWorking((prev) => prev.map((w) => (w.key === key ? { ...w, category } : w)));
  };

  // Deletion from the repertoire entirely — built and working server-side,
  // but deliberately NOT wired up on the client yet. Ask before enabling:
  // this permanently removes a song from the artist's reusable library,
  // not just from the current working list. To enable, uncomment the
  // fetch below and wire a delete button to call it.
  const deleteFromRepertoire = async (_repertoireId: string) => {
    // const res = await fetch('/api/admin/ladies-night/repertoire', {
    //   method: 'DELETE',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ song_id: _repertoireId }),
    // });
    // if (res.ok) await loadRepertoire();
    console.log("Repertoire deletion is currently disabled.");
  };

  const submit = async () => {
    if (!eventId || working.length < MIN_SONGS_TO_PROPOSE) return;
    setSubmitting(true);
    setSubmitMessage(null);

    const res = await fetch("/api/admin/ladies-night/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        songs: working.map((w) => ({
          repertoire_id: w.repertoire_id,
          title: w.title,
          artist: w.artist,
          category: w.category,
          artwork_url: w.artwork_url,
          apple_track_id: w.apple_track_id,
          apple_music_url: w.apple_music_url,
        })),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSubmitMessage(
        data.error === "not_enough_songs"
          ? `Need at least ${data.need} songs — you had ${data.have}.`
          : "Something went wrong submitting your proposal."
      );
    } else {
      setSubmitMessage(`Proposed ${data.proposed} songs.`);
      setWorking([]);
      setResults([]);
      setQuery("");
      await loadEvent();
      await loadRepertoire();
    }

    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "white", padding: "10px 12px", fontSize: "13px", fontFamily: "sans-serif", outline: "none", width: "100%" };
  const labelStyle: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", marginBottom: "6px", display: "block" };

  const formatEventDate = (ymd: string) =>
    new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="ln-shell">
      <style>{`
        .ln-shell{ display:flex; flex-direction:column; height:100vh; background:#0A0A0A; color:white; font-family:sans-serif; }
        .ln-columns{ flex:1; min-height:0; display:flex; overflow:hidden; }
        .ln-col{ flex:1; min-width:0; overflow-y:auto; padding:20px 20px 110px; }
        .ln-col + .ln-col{ border-left:0.5px solid rgba(255,255,255,0.08); }
        @media (max-width: 900px){
          .ln-shell{ height:auto; min-height:100vh; }
          .ln-columns{ flex-direction:column; overflow:visible; flex:none; }
          .ln-col{ overflow-y:visible; }
          .ln-col + .ln-col{ border-left:none; border-top:0.5px solid rgba(255,255,255,0.08); }
        }
      `}</style>

      <div style={{ backgroundColor: "#0A0A0A", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <img src="/gyaldem_red_wl_transparent.png" alt="Gyal Dem" style={{ height: "60px", objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "8px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif", margin: "-4px 0 0 4px" }}>Artist</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{email}</span>
          <button onClick={onLogout} style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: "32px 20px", color: "rgba(255,255,255,0.4)" }}>Loading…</p>
      ) : !eventId ? (
        <p style={{ padding: "32px 20px", color: "rgba(255,255,255,0.4)" }}>No upcoming event yet — check back once one's created.</p>
      ) : (
        <>
          <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
            {eventTitle && (
              <p style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: "0 0 10px" }}>
                {eventTitle}{eventDate && ` · ${formatEventDate(eventDate)}`}
              </p>
            )}
            <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "26px", margin: "0 0 6px" }}>Propose Your Set</h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "0 0 10px" }}>
              Search for songs and add at least {MIN_SONGS_TO_PROPOSE} to submit — 90s/2000s R&B, a touch of 80s, a little jazz.
            </p>
          </div>

          <div className="ln-columns">

            {/* LEFT: Your Repertoire */}
            <div className="ln-col">
              <p style={labelStyle}>Your Current Repertoire</p>
              {repertoire.length === 0 ? (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Nothing here yet — songs you propose get added automatically.</p>
              ) : (
                repertoire.map((item) => {
                  const added = working.some((w) => w.key === `rep-${item.id}`);
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                      <div
                        onClick={() => addFromRepertoire(item)}
                        style={{ flex: 1, fontSize: "13px", cursor: added ? "default" : "pointer", opacity: added ? 0.5 : 1 }}
                      >
                        {item.title} — {item.artist}
                      </div>
                      <select value={item.category ?? ""} onChange={() => { /* category edit on existing repertoire — not built yet */ }} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: "11px" }}>
                        <option value="" disabled>category</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={() => deleteFromRepertoire(item.id)} style={{ background: "none", border: "none", color: "#c86b6b", fontSize: "16px", cursor: "pointer", padding: "0 4px" }}>×</button>
                    </div>
                  );
                })
              )}
            </div>

            {/* CENTER: Search */}
            <div className="ln-col">
              {alreadyProposed.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <p style={labelStyle}>Already proposed ({alreadyProposed.length})</p>
                  {alreadyProposed.map((s) => (
                    <div key={s.song_id} style={{ fontSize: "13px", padding: "8px 0", borderBottom: "0.5px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between" }}>
                      <span>{s.ln_repertoire.title} — {s.ln_repertoire.artist}</span>
                      <span style={{ fontSize: "10px", textTransform: "uppercase", color: s.status === "published" ? "#6fae6f" : "rgba(255,255,255,0.4)" }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}

              <p style={labelStyle}>Search for a song</p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                  placeholder="Song or artist"
                  style={inputStyle}
                />
                <button onClick={runSearch} disabled={searching} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "0 16px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: searching ? "default" : "pointer", whiteSpace: "nowrap" }}>
                  {searching ? "…" : "Search"}
                </button>
              </div>

              {results.map((r) => {
                const added = working.some((w) => w.key === String(r.apple_track_id));
                return (
                  <div key={r.apple_track_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                    {r.artwork_url && <img src={r.artwork_url} alt="" style={{ width: "36px", height: "36px", objectFit: "cover" }} />}
                    <div style={{ flex: 1, fontSize: "13px" }}>
                      {r.title} — {r.artist}
                      {r.suggested_category && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}> · {r.suggested_category}</span>}
                    </div>
                    <button
                      onClick={() => addFromSearch(r)}
                      disabled={added}
                      style={{ backgroundColor: added ? "rgba(255,255,255,0.1)" : "white", color: added ? "rgba(255,255,255,0.4)" : "#0A0A0A", border: "none", padding: "6px 12px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: added ? "default" : "pointer" }}
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}

              <button onClick={() => setShowManual((v) => !v)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "11px", textDecoration: "underline", cursor: "pointer", padding: 0, margin: "16px 0" }}>
                {showManual ? "Hide manual entry" : "Can't find it? Add manually"}
              </button>

              {showManual && (
                <div style={{ marginBottom: "20px", padding: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p style={labelStyle}>Title</p>
                  <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }} />
                  <p style={labelStyle}>Artist</p>
                  <input type="text" value={manualArtist} onChange={(e) => setManualArtist(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }} />
                  <p style={labelStyle}>Category</p>
                  <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value as Category)} style={{ ...inputStyle, marginBottom: "12px" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={addManual} style={{ backgroundColor: "#8B1A1A", color: "white", border: "none", padding: "8px 14px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                    Add to List
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: Your List */}
            <div className="ln-col">
              <p style={labelStyle}>Your List ({working.length}/{MIN_SONGS_TO_PROPOSE})</p>
              {working.length === 0 ? (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Nothing added yet.</p>
              ) : (
                working.map((w) => (
                  <div key={w.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ flex: 1, fontSize: "13px" }}>{w.title} — {w.artist}</div>
                    <select value={w.category ?? ""} onChange={(e) => updateCategory(w.key, e.target.value as Category)} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: "11px" }}>
                      <option value="" disabled>category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => removeFromWorking(w.key)} style={{ background: "none", border: "none", color: "#c86b6b", fontSize: "16px", cursor: "pointer", padding: "0 4px" }}>×</button>
                  </div>
                ))
              )}
            </div>

          </div>
        </>
      )}

      {/* Fixed submit bar — always visible, never requires scrolling to find */}
      {eventId && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "16px 20px", backgroundColor: "#0A0A0A", borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={submit}
            disabled={working.length < MIN_SONGS_TO_PROPOSE || submitting}
            style={{ display: "block", width: "100%", backgroundColor: working.length >= MIN_SONGS_TO_PROPOSE ? "#8B1A1A" : "rgba(255,255,255,0.1)", color: working.length >= MIN_SONGS_TO_PROPOSE ? "white" : "rgba(255,255,255,0.4)", border: "none", padding: "14px", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", cursor: working.length >= MIN_SONGS_TO_PROPOSE && !submitting ? "pointer" : "default" }}
          >
            {submitting ? "Submitting…" : `Submit Proposal (${working.length}/${MIN_SONGS_TO_PROPOSE})`}
          </button>
          {submitMessage && (
            <p style={{ fontSize: "12px", color: submitMessage.startsWith("Proposed") ? "#6fae6f" : "#c86b6b", margin: "8px 0 0", textAlign: "center" }}>{submitMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}