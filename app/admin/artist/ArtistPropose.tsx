// admin/artist/ArtistPropose.tsx
//
// The Propose tab. Three columns: the artist's library (left), search
// (center), and the working list for their next show (right), with the
// submit bar fixed to the bottom. Columns stack on phones.
//
// - Booked show: the working list starts as the show's current ballot,
//   so resubmitting edits it instead of losing it. Order matters; it's
//   the order guests see. At least 10 songs.
// - Ballot published: read-only, since guests are already voting.
// - No booking yet: the same tools save songs to the library instead.

"use client";

import { useEffect, useState } from "react";
import { FAINT, GREEN, LINE, MUTED, RED, SOFT_RED, formatShowDate, heading, input, label, primaryButton } from "./ui";

const MIN_SONGS = 10;
// Removing songs from the library stays off until Kay decides she wants it.
const ENABLE_LIBRARY_DELETE = false;

type SearchResult = {
  apple_track_id: number;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  apple_music_url: string | null;
};
type LibrarySong = {
  id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  apple_track_id: number | null;
  apple_music_url: string | null;
};
type WorkingSong = {
  key: string;
  repertoire_id: string | null;
  title: string;
  artist: string;
  artwork_url: string | null;
  apple_track_id: number | null;
  apple_music_url: string | null;
};
type MyEvent = {
  id: string;
  title: string;
  event_date: string;
  voting_opens_at: string;
  ballot_published: boolean;
};
type BallotSong = {
  song_id: string;
  status: "draft" | "published";
  ln_repertoire: { title: string; artist: string; artwork_url: string | null; apple_track_id: number | null } | null;
};

const ERRORS: Record<string, string> = {
  not_enough_songs: `Add at least ${MIN_SONGS} songs.`,
  ballot_published: "Your ballot was just published, so the list is locked. Refresh to see it.",
  not_your_show: "This show isn't assigned to you anymore. Refresh the page.",
  unknown_song: "One of those songs isn't in your library anymore. Remove it and try again.",
  invalid_song: "One of the songs is missing a title or artist.",
};

function fromLibrary(s: LibrarySong): WorkingSong {
  return { key: `rep-${s.id}`, repertoire_id: s.id, title: s.title, artist: s.artist, artwork_url: s.artwork_url, apple_track_id: s.apple_track_id, apple_music_url: s.apple_music_url };
}

export default function ArtistPropose() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [event, setEvent] = useState<MyEvent | null>(null);
  const [ballot, setBallot] = useState<BallotSong[]>([]);
  const [library, setLibrary] = useState<LibrarySong[]>([]);
  const [working, setWorking] = useState<WorkingSong[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const [eventRes, libraryRes] = await Promise.all([
        fetch("/api/admin/ladies-night/my-event"),
        fetch("/api/admin/ladies-night/my-repertoire"),
      ]);
      if (!eventRes.ok || !libraryRes.ok) throw new Error("load failed");
      const eventData = await eventRes.json();
      const libraryData = await libraryRes.json();
      setEvent(eventData.event);
      setBallot(eventData.songs ?? []);
      setLibrary(libraryData.repertoire ?? []);
      // Start the working list from the current draft ballot, in order.
      setWorking(
        (eventData.songs ?? [])
          .filter((s: BallotSong) => s.ln_repertoire)
          .map((s: BallotSong) => ({
            key: `rep-${s.song_id}`,
            repertoire_id: s.song_id,
            title: s.ln_repertoire!.title,
            artist: s.ln_repertoire!.artist,
            artwork_url: s.ln_repertoire!.artwork_url,
            apple_track_id: s.ln_repertoire!.apple_track_id,
            apple_music_url: null,
          }))
      );
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Live search, 350ms after the last keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/ladies-night/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error();
        setResults((await res.json()).results ?? []);
        setSearchError(false);
      } catch {
        setSearchError(true);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const inList = (key: string) => working.some((w) => w.key === key);
  const add = (song: WorkingSong) => {
    if (!inList(song.key)) setWorking((prev) => [...prev, song]);
    setMessage(null);
  };
  const remove = (key: string) => setWorking((prev) => prev.filter((w) => w.key !== key));
  const move = (index: number, delta: number) =>
    setWorking((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addManual = () => {
    if (!manualTitle.trim() || !manualArtist.trim()) return;
    add({ key: `manual-${Date.now()}`, repertoire_id: null, title: manualTitle.trim(), artist: manualArtist.trim(), artwork_url: null, apple_track_id: null, apple_music_url: null });
    setManualTitle("");
    setManualArtist("");
  };

  const deleteFromLibrary = async (songId: string) => {
    if (!ENABLE_LIBRARY_DELETE) return;
    const res = await fetch("/api/admin/ladies-night/repertoire", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song_id: songId }),
    });
    if (res.ok) setLibrary((prev) => prev.filter((s) => s.id !== songId));
  };

  const payload = () =>
    working.map((w) => ({
      repertoire_id: w.repertoire_id,
      title: w.title,
      artist: w.artist,
      artwork_url: w.artwork_url,
      apple_track_id: w.apple_track_id,
      apple_music_url: w.apple_music_url,
    }));

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = event
        ? await fetch("/api/admin/ladies-night/propose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: event.id, songs: payload() }),
          })
        : await fetch("/api/admin/ladies-night/my-repertoire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songs: payload() }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: ERRORS[data.error] ?? "Something went wrong. Try again in a moment." });
      } else if (event) {
        setMessage({ ok: true, text: `Saved. Your ${data.proposed} songs are in, and Gyal Dem publishes the ballot before voting opens.` });
        await load();
      } else {
        setMessage({ ok: true, text: `Added ${data.added} songs to your library.` });
        setWorking([]);
        await load();
      }
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server. Check your connection and try again." });
    }
    setSaving(false);
  };

  if (loading) return <p style={{ padding: "32px 20px", color: FAINT }}>Loading…</p>;
  if (loadError) {
    return (
      <div style={{ padding: "32px 20px" }}>
        <p style={{ color: SOFT_RED, margin: "0 0 12px" }}>Couldn&apos;t load your show and library.</p>
        <button onClick={load} style={primaryButton()}>Try again</button>
      </div>
    );
  }

  // Published: guests are voting on this list, so it's read-only.
  if (event?.ballot_published) {
    return (
      <div style={{ padding: "28px 20px 40px", maxWidth: 720 }}>
        <p style={{ ...label, marginBottom: 10 }}>{event.title} · {formatShowDate(event.event_date)}</p>
        <h1 style={heading}>Your ballot is live</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: "0 0 20px" }}>
          Guests are voting on this list, so it can&apos;t change now. To fix something, ask Gyal Dem.
        </p>
        {ballot.map((s, i) => (
          <div key={s.song_id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: LINE, fontSize: 14 }}>
            <span style={{ color: FAINT, width: 22 }}>{i + 1}</span>
            <span>{s.ln_repertoire?.title} <span style={{ color: FAINT }}>· {s.ln_repertoire?.artist}</span></span>
          </div>
        ))}
      </div>
    );
  }

  const booked = !!event;
  const ready = booked ? working.length >= MIN_SONGS : working.length > 0;
  const buttonLabel = saving
    ? "Saving…"
    : booked
      ? `Submit list (${working.length}/${MIN_SONGS})`
      : `Save ${working.length} song${working.length === 1 ? "" : "s"} to my library`;

  return (
    <div className="ln-propose">
      <style>{`
        .ln-propose{ padding-bottom:120px; }
        .ln-columns{ display:flex; align-items:flex-start; }
        .ln-col{ flex:1; min-width:0; padding:20px; }
        .ln-col + .ln-col{ border-left:${LINE}; }
        @media (max-width: 900px){
          .ln-columns{ flex-direction:column; }
          .ln-col{ width:100%; box-sizing:border-box; }
          .ln-col + .ln-col{ border-left:none; border-top:${LINE}; }
        }
      `}</style>

      <div style={{ padding: "24px 20px 0" }}>
        {booked ? (
          <>
            <p style={{ ...label, marginBottom: 10 }}>{event!.title} · {formatShowDate(event!.event_date)}</p>
            <h1 style={heading}>Propose your set</h1>
            <p style={{ fontSize: 14, color: MUTED, margin: 0, maxWidth: 680 }}>
              Pick at least {MIN_SONGS} songs. Guests vote on them in this order, so put the ones you most want to sing first.
            </p>
          </>
        ) : (
          <>
            <h1 style={heading}>Your library</h1>
            <p style={{ fontSize: 14, color: MUTED, margin: 0, maxWidth: 680 }}>
              You&apos;re not booked on an upcoming show yet. Build your library now, and it&apos;ll be ready when you are.
            </p>
          </>
        )}
      </div>

      <div className="ln-columns">
        <section className="ln-col" aria-label="Your library">
          <span style={label}>Your library ({library.length})</span>
          {library.length === 0 ? (
            <p style={{ fontSize: 13, color: FAINT }}>Empty for now. Every song you add lands here, ready for your next show.</p>
          ) : (
            library.map((song) => {
              const added = inList(`rep-${song.id}`);
              return (
                <div key={song.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: LINE }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    {song.title} <span style={{ color: FAINT }}>· {song.artist}</span>
                  </div>
                  {booked && (
                    <button
                      onClick={() => add(fromLibrary(song))}
                      disabled={added}
                      aria-label={added ? `${song.title} is on your list` : `Add ${song.title} to your list`}
                      style={smallButton(added)}
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  )}
                  {ENABLE_LIBRARY_DELETE && (
                    <button onClick={() => deleteFromLibrary(song.id)} aria-label={`Remove ${song.title} from your library`} style={iconButton}>×</button>
                  )}
                </div>
              );
            })
          )}
        </section>

        <section className="ln-col" aria-label="Search">
          <label htmlFor="ln-search" style={label}>Search Apple Music</label>
          <input id="ln-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Song or artist" style={{ ...input, marginBottom: 12 }} />
          {searching && <p style={{ fontSize: 12, color: FAINT }}>Searching…</p>}
          {searchError && <p style={{ fontSize: 12, color: SOFT_RED }}>Search isn&apos;t responding. Try again, or add the song by hand below.</p>}
          {!searching && !searchError && query.trim().length >= 2 && results.length === 0 && (
            <p style={{ fontSize: 12, color: FAINT }}>No matches. Try fewer words, or add it by hand below.</p>
          )}
          {results.map((r) => {
            const key = String(r.apple_track_id);
            const added = inList(key) || library.some((l) => l.apple_track_id === r.apple_track_id && inList(`rep-${l.id}`));
            return (
              <div key={r.apple_track_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: LINE }}>
                {r.artwork_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.artwork_url} alt="" style={{ width: 36, height: 36, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  {r.title} <span style={{ color: FAINT }}>· {r.artist}</span>
                </div>
                <button
                  onClick={() => add({ key, repertoire_id: null, title: r.title, artist: r.artist, artwork_url: r.artwork_url, apple_track_id: r.apple_track_id, apple_music_url: r.apple_music_url })}
                  disabled={added}
                  aria-label={added ? `${r.title} is on your list` : `Add ${r.title}`}
                  style={smallButton(added, true)}
                >
                  {added ? "Added" : "Add"}
                </button>
              </div>
            );
          })}

          <button onClick={() => setShowManual((v) => !v)} aria-expanded={showManual} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0, margin: "16px 0" }}>
            {showManual ? "Hide manual entry" : "Can't find it? Add it by hand"}
          </button>
          {showManual && (
            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.1)" }}>
              <label htmlFor="ln-manual-title" style={label}>Song title</label>
              <input id="ln-manual-title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} style={{ ...input, marginBottom: 10 }} />
              <label htmlFor="ln-manual-artist" style={label}>Original artist</label>
              <input id="ln-manual-artist" value={manualArtist} onChange={(e) => setManualArtist(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} style={{ ...input, marginBottom: 12 }} />
              <button onClick={addManual} style={primaryButton(!!manualTitle.trim() && !!manualArtist.trim())}>Add to list</button>
            </div>
          )}
        </section>

        <section className="ln-col" aria-label={booked ? "Your list for this show" : "Songs to save"}>
          <span style={label}>{booked ? `Your list (${working.length}/${MIN_SONGS})` : `To save (${working.length})`}</span>
          {working.length === 0 ? (
            <p style={{ fontSize: 13, color: FAINT }}>Nothing yet. Add songs from your library or search.</p>
          ) : (
            working.map((w, i) => (
              <div key={w.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: LINE }}>
                <span style={{ color: FAINT, fontSize: 12, width: 20, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  {w.title} <span style={{ color: FAINT }}>· {w.artist}</span>
                </div>
                {booked && (
                  <>
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${w.title} up`} style={{ ...iconButton, opacity: i === 0 ? 0.25 : 1 }}>↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === working.length - 1} aria-label={`Move ${w.title} down`} style={{ ...iconButton, opacity: i === working.length - 1 ? 0.25 : 1 }}>↓</button>
                  </>
                )}
                <button onClick={() => remove(w.key)} aria-label={`Remove ${w.title}`} style={{ ...iconButton, color: SOFT_RED }}>×</button>
              </div>
            ))
          )}
        </section>
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "14px 20px 18px", background: "#0A0A0A", borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
        <button onClick={submit} disabled={!ready || saving} style={{ ...primaryButton(ready && !saving), display: "block", width: "100%" }}>
          {buttonLabel}
        </button>
        {message && (
          <p role="status" style={{ fontSize: 12, color: message.ok ? GREEN : SOFT_RED, margin: "8px 0 0", textAlign: "center" }}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

const iconButton = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.7)",
  fontSize: 16,
  cursor: "pointer",
  minWidth: 32,
  minHeight: 32,
  padding: 0,
} as const;

function smallButton(added: boolean, light = false) {
  return {
    backgroundColor: added ? "rgba(255,255,255,0.1)" : light ? "white" : RED,
    color: added ? FAINT : light ? "#0A0A0A" : "white",
    border: "none",
    padding: "7px 12px",
    minHeight: 32,
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    cursor: added ? "default" : "pointer",
    flexShrink: 0,
  };
}
