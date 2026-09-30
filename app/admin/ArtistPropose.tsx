// ArtistPropose.tsx  (same folder as AdminDashboard.tsx, AdminLadiesNight.tsx, etc.)
//
// The artist-role screen — replaces the placeholder in AdminPage.tsx.
// Search iTunes, build a working list, submit once 10+ are selected.
// Manual entry covers songs iTunes won't have (jazz standards, etc.).
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

type WorkingSong = {
  key: string; // apple_track_id, or "manual-<n>" for manual entries
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

  useEffect(() => { loadEvent(); }, []);

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
  // before actually calling the API, so it's not firing on every letter.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => { runSearch(); }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const addToWorking = (song: SearchResult) => {
    const key = String(song.apple_track_id);
    if (working.some((w) => w.key === key)) return; // already added
    setWorking((prev) => [...prev, {
      key,
      title: song.title,
      artist: song.artist,
      category: song.suggested_category,
      artwork_url: song.artwork_url,
      apple_track_id: song.apple_track_id,
      apple_music_url: song.apple_music_url,
    }]);
  };

  const addManual = () => {
    if (!manualTitle.trim() || !manualArtist.trim()) return;
    const key = `manual-${Date.now()}`;
    setWorking((prev) => [...prev, {
      key,
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
    }

    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "white", padding: "10px 12px", fontSize: "13px", fontFamily: "sans-serif", outline: "none", width: "100%" };
  const labelStyle: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", marginBottom: "6px", display: "block" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0A", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ backgroundColor: "#0A0A0A", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
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

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 20px" }}>
        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
        ) : !eventId ? (
          <p style={{ color: "rgba(255,255,255,0.4)" }}>No upcoming event yet — check back once one's created.</p>
        ) : (
          <>
            {eventTitle && (
              <p style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: "0 0 10px" }}>
                {eventTitle}
                {eventDate && ` · ${new Date(eventDate + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}`}
              </p>
            )}
            <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "26px", margin: "0 0 6px" }}>Propose Your Set</h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "0 0 28px" }}>
              Search for songs and add at least {MIN_SONGS_TO_PROPOSE} to submit — 90s/2000s R&B, a touch of 80s, a little jazz.
            </p>

            {alreadyProposed.length > 0 && (
              <div style={{ marginBottom: "28px" }}>
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

            {results.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
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
                        onClick={() => addToWorking(r)}
                        disabled={added}
                        style={{ backgroundColor: added ? "rgba(255,255,255,0.1)" : "white", color: added ? "rgba(255,255,255,0.4)" : "#0A0A0A", border: "none", padding: "6px 12px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: added ? "default" : "pointer" }}
                      >
                        {added ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => setShowManual((v) => !v)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "11px", textDecoration: "underline", cursor: "pointer", padding: 0, marginBottom: "20px" }}>
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

            <p style={labelStyle}>Your list ({working.length}/{MIN_SONGS_TO_PROPOSE})</p>
            {working.length === 0 ? (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "20px" }}>Nothing added yet.</p>
            ) : (
              <div style={{ marginBottom: "20px" }}>
                {working.map((w) => (
                  <div key={w.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ flex: 1, fontSize: "13px" }}>{w.title} — {w.artist}</div>
                    <select value={w.category ?? ""} onChange={(e) => updateCategory(w.key, e.target.value as Category)} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: "11px" }}>
                      <option value="" disabled>category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => removeFromWorking(w.key)} style={{ background: "none", border: "none", color: "#c86b6b", fontSize: "16px", cursor: "pointer", padding: "0 4px" }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={submit}
              disabled={working.length < MIN_SONGS_TO_PROPOSE || submitting}
              style={{ display: "block", width: "100%", backgroundColor: working.length >= MIN_SONGS_TO_PROPOSE ? "#8B1A1A" : "rgba(255,255,255,0.1)", color: working.length >= MIN_SONGS_TO_PROPOSE ? "white" : "rgba(255,255,255,0.4)", border: "none", padding: "14px", fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", cursor: working.length >= MIN_SONGS_TO_PROPOSE && !submitting ? "pointer" : "default" }}
            >
              {submitting ? "Submitting…" : `Submit Proposal (${working.length}/${MIN_SONGS_TO_PROPOSE})`}
            </button>

            {submitMessage && (
              <p style={{ fontSize: "12px", color: submitMessage.startsWith("Proposed") ? "#6fae6f" : "#c86b6b", marginTop: "12px" }}>{submitMessage}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}