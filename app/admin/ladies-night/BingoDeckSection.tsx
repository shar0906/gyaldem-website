// admin/ladies-night/BingoDeckSection.tsx
//
// The bingo deck: the line the host reads, the song, and the artist
// (the answer printed on the cards). Add lines one at a time or import a
// spreadsheet; switch lines on and off; export the artist list for
// whoever prints the cards.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FAINT, Field, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, Stat, api, button, errorText, inputStyle } from "./kit";

type Entry = { id: string; line: string; song: string; artist: string; active: boolean };
type Stats = { total: number; active: number; artists: number; enough_for_cards: boolean };
type ImportReport = { added: number; skipped: number; invalid: { row: number; reason: string }[] };

export default function BingoDeckSection() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ line: "", song: "", artist: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ entries: Entry[]; stats: Stats }>("/api/admin/ladies-night/bingo/deck");
    if (!res.ok) return setLoadError(errorText(res.data as unknown as { error?: string }));
    setEntries(res.data.entries);
    setStats(res.data.stats);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!entries) return [];
    return q ? entries.filter((e) => [e.line, e.song, e.artist].some((v) => v.toLowerCase().includes(q))) : entries;
  }, [entries, query]);

  async function addOne() {
    setBusy("add");
    setNotice(null);
    const res = await api<ImportReport & { error?: string }>("/api/admin/ladies-night/bingo/deck", { method: "POST", body: { entries: [form] } });
    setBusy(null);
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data) });
    if (res.data.invalid.length) return setNotice({ tone: "error", text: res.data.invalid[0].reason });
    if (res.data.skipped) return setNotice({ tone: "error", text: "That line is already in the deck." });
    setForm({ line: "", song: "", artist: "" });
    setNotice({ tone: "ok", text: "Added." });
    load();
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) return setNotice({ tone: "error", text: "That file is over 1 MB. Split it into smaller files." });
    setBusy("import");
    setNotice(null);
    setReport(null);
    const csv = await file.text();
    const res = await api<ImportReport & { error?: string; max?: number }>("/api/admin/ladies-night/bingo/deck", { method: "POST", body: { csv } });
    setBusy(null);
    if (!res.ok) {
      return setNotice({ tone: "error", text: res.data.error === "too_many_rows" ? `Import up to ${res.data.max} rows at a time.` : errorText(res.data) });
    }
    setReport(res.data);
    load();
  }

  async function toggle(e: Entry) {
    const res = await api(`/api/admin/ladies-night/bingo/deck/${e.id}`, { method: "PATCH", body: { active: !e.active } });
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data) });
    load();
  }

  async function remove(e: Entry) {
    if (!confirm(`Delete "${e.line}"?`)) return;
    const res = await api<{ error?: string }>(`/api/admin/ladies-night/bingo/deck/${e.id}`, { method: "DELETE" });
    if (!res.ok) {
      return setNotice({
        tone: "error",
        text: res.data.error === "in_use" ? "That line has already been called in a game, so it can't be deleted. Switch it off instead." : errorText(res.data),
      });
    }
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await api<{ error?: string; message?: string }>(`/api/admin/ladies-night/bingo/deck/${editing.id}`, {
      method: "PATCH",
      body: { line: editing.line, song: editing.song, artist: editing.artist },
    });
    if (!res.ok) return setNotice({ tone: "error", text: res.data.error === "duplicate_line" ? "Another entry already has that line." : errorText(res.data) });
    setEditing(null);
    load();
  }

  if (loadError) return <div><H1>Bingo deck</H1><Notice tone="error">{loadError}</Notice></div>;
  if (!entries || !stats) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;

  const canAdd = form.line.trim() && form.song.trim() && form.artist.trim() && busy === null;

  return (
    <div>
      <style>{`
        .ln-deck-row{ display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto; gap:14px; align-items:center; padding:10px 20px; border-bottom:${LINE}; font-size:13px; }
        .ln-deck-add{ display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto; gap:12px; align-items:end; }
        @media (max-width: 860px){ .ln-deck-row, .ln-deck-add{ grid-template-columns:1fr; } .ln-deck-head{ display:none !important; } }
      `}</style>
      <H1
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/api/admin/ladies-night/bingo/deck?format=csv&list=artists" style={button("secondary")}>Export artists for cards</a>
            <a href="/api/admin/ladies-night/bingo/deck?format=csv" style={button("quiet")}>Export deck</a>
          </div>
        }
      >
        Bingo deck
      </H1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat name="Lines switched on" value={stats.active} note={`${stats.total} in the deck`} />
        <Stat
          name="Different artists"
          value={stats.artists}
          note={stats.enough_for_cards ? <span style={{ color: GREEN }}>Enough for 5×5 cards</span> : <span style={{ color: RED }}>Cards need at least 24</span>}
        />
      </div>

      <div style={{ ...PANEL, padding: 20, marginBottom: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="ln-deck-add">
          <Field id="d-line" label="Line the host reads">
            <input id="d-line" value={form.line} maxLength={300} onChange={(e) => setForm({ ...form, line: e.target.value })} style={inputStyle} />
          </Field>
          <Field id="d-song" label="Song">
            <input id="d-song" value={form.song} maxLength={200} onChange={(e) => setForm({ ...form, song: e.target.value })} style={inputStyle} />
          </Field>
          <Field id="d-artist" label="Artist (answer on the card)">
            <input id="d-artist" value={form.artist} maxLength={120} onChange={(e) => setForm({ ...form, artist: e.target.value })} onKeyDown={(e) => e.key === "Enter" && canAdd && addOne()} style={inputStyle} />
          </Field>
          <button onClick={addOne} disabled={!canAdd} style={button("primary", !!canAdd)}>{busy === "add" ? "Adding…" : "Add"}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 14, borderTop: LINE }}>
          <label style={{ ...button("secondary", busy === null), cursor: busy === null ? "pointer" : "default" }}>
            {busy === "import" ? "Importing…" : "Import spreadsheet (CSV)"}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy !== null}
              onChange={(e) => {
                importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
            />
          </label>
          <span style={{ fontSize: 12, color: MUTED }}>Three columns: line, song, artist. A header row is fine. Lines already in the deck are skipped.</span>
        </div>
        {report && (
          <div style={{ fontSize: 13 }}>
            <span style={{ color: GREEN }}>Added {report.added}.</span>{" "}
            {report.skipped > 0 && <span style={{ color: MUTED }}>Skipped {report.skipped} already in the deck. </span>}
            {report.invalid.length > 0 && (
              <span style={{ color: RED }}>
                {report.invalid.length} row{report.invalid.length === 1 ? "" : "s"} need fixing:{" "}
                {report.invalid.slice(0, 5).map((r) => `row ${r.row} (${r.reason.replace(/\.$/, "").toLowerCase()})`).join("; ")}
                {report.invalid.length > 5 ? "; and more." : "."}
              </span>
            )}
          </div>
        )}
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="d-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search the deck</label>
        <input id="d-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lines, songs, or artists" style={{ ...inputStyle, maxWidth: 360 }} />
      </div>

      <div style={PANEL}>
        <div className="ln-deck-row ln-deck-head" style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>
          <span>Line</span><span>Song</span><span>Artist</span><span />
        </div>
        {filtered.length === 0 && (
          <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>{entries.length ? "Nothing matches that search." : "The deck is empty. Add lines above or import a spreadsheet."}</p>
        )}
        {filtered.map((e) =>
          editing?.id === e.id ? (
            <div key={e.id} className="ln-deck-row">
              <input aria-label="Line" value={editing.line} onChange={(ev) => setEditing({ ...editing, line: ev.target.value })} style={inputStyle} />
              <input aria-label="Song" value={editing.song} onChange={(ev) => setEditing({ ...editing, song: ev.target.value })} style={inputStyle} />
              <input aria-label="Artist" value={editing.artist} onChange={(ev) => setEditing({ ...editing, artist: ev.target.value })} style={inputStyle} />
              <span style={{ display: "flex", gap: 4 }}>
                <button onClick={saveEdit} style={button("primary")}>Save</button>
                <button onClick={() => setEditing(null)} style={button("quiet")}>Cancel</button>
              </span>
            </div>
          ) : (
            <div key={e.id} className="ln-deck-row" style={{ opacity: e.active ? 1 : 0.5 }}>
              <span style={{ overflowWrap: "anywhere" }}>{e.line}</span>
              <span style={{ color: MUTED }}>{e.song}</span>
              <span style={{ fontWeight: 600 }}>{e.artist}</span>
              <span style={{ display: "flex", gap: 2, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => toggle(e)} style={button("quiet")}>{e.active ? "Switch off" : "Switch on"}</button>
                <button onClick={() => setEditing(e)} style={button("quiet")}>Edit</button>
                <button onClick={() => remove(e)} style={{ ...button("quiet"), color: RED }}>Delete</button>
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
