// admin/ladies-night/BingoDecksSection.tsx
//
// The bingo deck library: themed decks any show can use (Music bingo,
// Spooky Szn, Gyalentine's...). Two kinds:
//   Match            the line is read and printed as is ("Say Less")
//   Callout → Answer the line is read; the answer (song by artist) is on
//                    the card. Song and artist stay separate fields.
// Add lines one at a time, paste a list, or import a spreadsheet. For
// printing: Export for Canva makes a CSV of randomized cards for Canva
// Bulk Create; Copy list copies the numbered list for the Bingo List page.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FAINT, Field, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, Stat, api, button, errorText, inputStyle, sectionLabel, selectStyle } from "./kit";

type Kind = "match" | "callout_answer";
type Face = "answer" | "artist";
type Deck = { id: string; name: string; kind: Kind; card_face: Face; active: boolean; lines: number; upcoming_shows: number };
type DeckDetail = { id: string; name: string; kind: Kind; card_face: Face; active: boolean; lines: number; card_squares: number; enough_for_cards: boolean };
type Entry = { id: string; line: string; song: string | null; artist: string | null; active: boolean; sort_order: number };
type ImportReport = { added: number; skipped: number; invalid: { row: number; reason: string }[] };

const KIND_LABEL: Record<Kind, string> = { match: "Match", callout_answer: "Callout → Answer" };

function answer(e: Pick<Entry, "song" | "artist">): string {
  if (e.song && e.artist) return `${e.song} by ${e.artist}`;
  return e.song ?? e.artist ?? "";
}

function cardFace(e: Entry, kind: Kind, face: Face): string {
  if (kind === "match") return e.line;
  if (face === "artist") return e.artist ?? e.song ?? e.line;
  return answer(e) || e.line;
}

export default function BingoDecksSection() {
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDeck, setNewDeck] = useState<{ name: string; kind: Kind; card_face: Face }>({ name: "", kind: "match", card_face: "answer" });
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const loadDecks = useCallback(async () => {
    const res = await api<{ decks: Deck[] }>("/api/admin/ladies-night/bingo/decks");
    if (!res.ok) return setLoadError(errorText(res.data as unknown as { error?: string }));
    setDecks(res.data.decks);
    setSelected((s) => s ?? res.data.decks[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  async function create() {
    setNotice(null);
    const res = await api<{ deck?: Deck; error?: string; message?: string }>("/api/admin/ladies-night/bingo/decks", { method: "POST", body: newDeck });
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data) });
    setCreating(false);
    setNewDeck({ name: "", kind: "match", card_face: "answer" });
    await loadDecks();
    setSelected(res.data.deck!.id);
  }

  if (loadError) return <div><H1>Bingo decks</H1><Notice tone="error">{loadError}</Notice></div>;
  if (!decks) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;

  return (
    <div>
      <style>{`
        .ln-decks{ display:grid; grid-template-columns:250px minmax(0,1fr); gap:24px; align-items:start; }
        @media (max-width: 860px){ .ln-decks{ grid-template-columns:1fr; } }
      `}</style>
      <H1 action={<button onClick={() => setCreating(!creating)} style={button("primary")}>{creating ? "Close" : "+ New deck"}</button>}>Bingo decks</H1>
      {creating && (
        <div style={{ ...PANEL, padding: 20, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, alignItems: "end" }}>
          <Field id="nd-name" label="Deck name">
            <input id="nd-name" value={newDeck.name} maxLength={80} onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })} placeholder="Spooky Szn" style={inputStyle} />
          </Field>
          <Field id="nd-kind" label="Type">
            <select id="nd-kind" value={newDeck.kind} onChange={(e) => setNewDeck({ ...newDeck, kind: e.target.value as Kind })} style={selectStyle}>
              <option value="match">Match (the phrase is on the card)</option>
              <option value="callout_answer">Callout → Answer (song by artist on the card)</option>
            </select>
          </Field>
          {newDeck.kind === "callout_answer" && (
            <Field id="nd-face" label="On the card">
              <select id="nd-face" value={newDeck.card_face} onChange={(e) => setNewDeck({ ...newDeck, card_face: e.target.value as Face })} style={selectStyle}>
                <option value="answer">Song by Artist</option>
                <option value="artist">Artist only</option>
              </select>
            </Field>
          )}
          <button onClick={create} disabled={!newDeck.name.trim()} style={button("primary", !!newDeck.name.trim())}>Create deck</button>
        </div>
      )}
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}

      <div className="ln-decks">
        <nav aria-label="Decks" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {decks.length === 0 && <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No decks yet.</p>}
          {decks.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              aria-current={d.id === selected}
              style={{ ...PANEL, border: d.id === selected ? `1px solid ${RED}` : PANEL.border, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", opacity: d.active ? 1 : 0.55, fontFamily: "sans-serif" }}
            >
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>{d.name}</span>
              <span style={{ fontSize: 12, color: MUTED }}>
                {KIND_LABEL[d.kind]} · {d.lines} line{d.lines === 1 ? "" : "s"}
                {d.upcoming_shows ? ` · ${d.upcoming_shows} upcoming show${d.upcoming_shows === 1 ? "" : "s"}` : ""}
              </span>
            </button>
          ))}
        </nav>
        {selected ? <DeckEditor key={selected} deckId={selected} onChange={loadDecks} /> : <div style={{ ...PANEL, padding: 24, color: MUTED }}>Create a deck to start.</div>}
      </div>
    </div>
  );
}

function DeckEditor({ deckId, onChange }: { deckId: string; onChange: () => void }) {
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({ line: "", song: "", artist: "" });
  const [paste, setPaste] = useState("");
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState("60");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [rename, setRename] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ deck: DeckDetail; entries: Entry[] }>(`/api/admin/ladies-night/bingo/decks/${deckId}`);
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data as unknown as { error?: string }) });
    setDeck(res.data.deck);
    setEntries(res.data.entries);
  }, [deckId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => [e.line, e.song ?? "", e.artist ?? ""].some((v) => v.toLowerCase().includes(q))) : entries;
  }, [entries, query]);

  if (!deck) return <div style={{ ...PANEL, padding: 24, color: MUTED }}>{notice ? <Notice tone="error">{notice.text}</Notice> : "Loading deck…"}</div>;
  const match = deck.kind === "match";

  async function patchDeck(body: Record<string, unknown>) {
    const res = await api<{ error?: string; message?: string }>(`/api/admin/ladies-night/bingo/decks/${deckId}`, { method: "PATCH", body });
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data) });
    setRename(null);
    await load();
    onChange();
  }

  async function add(body: Record<string, unknown>, kind: string) {
    setBusy(kind);
    setNotice(null);
    setReport(null);
    const res = await api<ImportReport & { error?: string; max?: number }>("/api/admin/ladies-night/bingo/deck", { method: "POST", body: { deck_id: deckId, ...body } });
    setBusy(null);
    if (!res.ok) return setNotice({ tone: "error", text: res.data.error === "too_many_rows" ? `Add up to ${res.data.max} lines at a time.` : errorText(res.data) });
    if (kind === "one") {
      if (res.data.invalid.length) return setNotice({ tone: "error", text: res.data.invalid[0].reason });
      if (res.data.skipped) return setNotice({ tone: "error", text: "That line is already in the deck." });
      setForm({ line: "", song: "", artist: "" });
    } else {
      setReport(res.data);
      if (kind === "paste") setPaste("");
    }
    await load();
    onChange();
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) return setNotice({ tone: "error", text: "That file is over 1 MB. Split it into smaller files." });
    await add({ csv: await file.text() }, "import");
  }

  async function toggle(e: Entry) {
    const res = await api(`/api/admin/ladies-night/bingo/deck/${e.id}`, { method: "PATCH", body: { active: !e.active } });
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data) });
    load();
    onChange();
  }

  async function remove(e: Entry) {
    if (!confirm(`Delete "${e.line}"?`)) return;
    const res = await api<{ error?: string }>(`/api/admin/ladies-night/bingo/deck/${e.id}`, { method: "DELETE" });
    if (!res.ok) {
      return setNotice({ tone: "error", text: res.data.error === "in_use" ? "That line has already been called in a game, so it can't be deleted. Switch it off instead." : errorText(res.data) });
    }
    load();
    onChange();
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await api<{ error?: string; message?: string }>(`/api/admin/ladies-night/bingo/deck/${editing.id}`, {
      method: "PATCH",
      body: match ? { line: editing.line } : { line: editing.line, song: editing.song, artist: editing.artist },
    });
    if (!res.ok) return setNotice({ tone: "error", text: res.data.error === "duplicate_line" ? "Another line in this deck already says that." : errorText(res.data) });
    setEditing(null);
    load();
  }

  async function copyList() {
    const faces = [...new Set(entries.filter((e) => e.active).map((e) => cardFace(e, deck!.kind, deck!.card_face)))];
    const text = faces.map((f, i) => `${i + 1}. ${f}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: "ok", text: `Copied ${faces.length} numbered lines. Paste them into the Bingo List page in Canva.` });
    } catch {
      setNotice({ tone: "error", text: "Your browser blocked copying. Use Export deck instead." });
    }
  }

  const n = Number.parseInt(cards, 10);
  const cardsOk = Number.isInteger(n) && n >= 1 && n <= 300;
  const canAdd = form.line.trim() && (match || form.song.trim() || form.artist.trim()) && busy === null;
  const cols = match ? "minmax(0,1fr) auto" : "minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) auto";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .ln-deck-row{ display:grid; grid-template-columns:${cols}; gap:14px; align-items:center; padding:10px 20px; border-bottom:${LINE}; font-size:13px; }
        .ln-deck-add{ display:grid; grid-template-columns:${cols}; gap:12px; align-items:end; }
        @media (max-width: 860px){ .ln-deck-row, .ln-deck-add{ grid-template-columns:1fr; } .ln-deck-head{ display:none !important; } }
      `}</style>

      <div style={{ ...PANEL, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {rename === null ? (
            <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 26 }}>
              {deck.name} <button onClick={() => setRename(deck.name)} style={{ ...button("quiet"), padding: "4px 8px" }}>Rename</button>
            </h2>
          ) : (
            <span style={{ display: "flex", gap: 6 }}>
              <input aria-label="Deck name" value={rename} maxLength={80} onChange={(e) => setRename(e.target.value)} style={{ ...inputStyle, width: 240 }} />
              <button onClick={() => patchDeck({ name: rename })} style={button("primary")}>Save</button>
              <button onClick={() => setRename(null)} style={button("quiet")}>Cancel</button>
            </span>
          )}
          <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select aria-label="Deck type" value={deck.kind} onChange={(e) => patchDeck({ kind: e.target.value })} style={{ ...selectStyle, width: "auto" }}>
              <option value="match">Match</option>
              <option value="callout_answer">Callout → Answer</option>
            </select>
            {!match && (
              <select aria-label="On the card" value={deck.card_face} onChange={(e) => patchDeck({ card_face: e.target.value })} style={{ ...selectStyle, width: "auto" }}>
                <option value="answer">Card: Song by Artist</option>
                <option value="artist">Card: Artist only</option>
              </select>
            )}
            <button onClick={() => patchDeck({ active: !deck.active })} style={button("quiet")}>{deck.active ? "Hide deck" : "Show deck"}</button>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <Stat name="Lines switched on" value={deck.lines} note={`${entries.length} in the deck`} />
          <Stat
            name="Different card squares"
            value={deck.card_squares}
            note={deck.enough_for_cards ? <span style={{ color: GREEN }}>Enough for 5×5 cards</span> : <span style={{ color: RED }}>Cards need at least 24</span>}
          />
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: LINE }}>
          <p style={sectionLabel}>Printing</p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field id="dk-cards" label="Cards">
              <input id="dk-cards" inputMode="numeric" value={cards} onChange={(e) => setCards(e.target.value.replace(/\D/g, ""))} style={{ ...inputStyle, width: 90 }} />
            </Field>
            {deck.enough_for_cards && cardsOk ? (
              <a href={`/api/admin/ladies-night/bingo/decks/${deckId}?format=canva&cards=${n}`} style={button("secondary")}>Export for Canva</a>
            ) : (
              <span style={{ ...button("secondary", false) }}>Export for Canva</span>
            )}
            <button onClick={copyList} style={button("quiet")}>Copy list</button>
            <a href={`/api/admin/ladies-night/bingo/decks/${deckId}?format=csv`} style={button("quiet")}>Export deck</a>
          </div>
          <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            Export for Canva: one row per card, columns card_no and r1c1 to r5c5 (no center square, that&apos;s the logo), up to 300 cards. In Canva, open the card design, go to Apps → Bulk create, upload the file, and connect each square&apos;s text box to its column once. Copy list copies the numbered list for the Bingo List page.
          </span>
        </section>
      </div>

      <div style={{ ...PANEL, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="ln-deck-add">
          <Field id="d-line" label={match ? "Phrase (read out and on the card)" : "Callout (what the host reads)"}>
            <input id="d-line" value={form.line} maxLength={300} onChange={(e) => setForm({ ...form, line: e.target.value })} onKeyDown={(e) => match && e.key === "Enter" && canAdd && add({ entries: [form] }, "one")} style={inputStyle} />
          </Field>
          {!match && (
            <>
              <Field id="d-song" label="Song">
                <input id="d-song" value={form.song} maxLength={200} onChange={(e) => setForm({ ...form, song: e.target.value })} style={inputStyle} />
              </Field>
              <Field id="d-artist" label="Artist">
                <input id="d-artist" value={form.artist} maxLength={120} onChange={(e) => setForm({ ...form, artist: e.target.value })} onKeyDown={(e) => e.key === "Enter" && canAdd && add({ entries: [form] }, "one")} style={inputStyle} />
              </Field>
            </>
          )}
          <button onClick={() => add({ entries: [form] }, "one")} disabled={!canAdd} style={button("primary", !!canAdd)}>{busy === "one" ? "Adding…" : "Add"}</button>
        </div>
        {match && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 14, borderTop: LINE }}>
            <Field id="d-paste" label="Or paste a list" hint="One phrase per line. Numbering like “12.” is removed.">
              <textarea id="d-paste" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"1. Lover Girl\n2. Real Bad\n3. Sister Circle"} style={{ ...inputStyle, lineHeight: 1.45, resize: "vertical" }} />
            </Field>
            <button onClick={() => add({ text: paste }, "paste")} disabled={!paste.trim() || busy !== null} style={{ ...button("secondary", !!paste.trim() && busy === null), alignSelf: "flex-start" }}>
              {busy === "paste" ? "Adding…" : "Add these"}
            </button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 14, borderTop: LINE }}>
          <label style={{ ...button("secondary", busy === null), cursor: busy === null ? "pointer" : "default", position: "relative" }}>
            {busy === "import" ? "Importing…" : "Import spreadsheet (CSV)"}
            <input type="file" accept=".csv,text/csv" disabled={busy !== null} onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} />
          </label>
          <span style={{ fontSize: 12, color: MUTED }}>
            {match ? "One column: the phrase." : "Three columns: callout, song, artist."} A header row is fine. Lines already in the deck are skipped.
          </span>
        </div>
        {report && (
          <div style={{ fontSize: 13 }}>
            <span style={{ color: GREEN }}>Added {report.added}.</span>{" "}
            {report.skipped > 0 && <span style={{ color: MUTED }}>Skipped {report.skipped} already in the deck. </span>}
            {report.invalid.length > 0 && (
              <span style={{ color: RED }}>
                {report.invalid.length} row{report.invalid.length === 1 ? "" : "s"} need fixing: {report.invalid.slice(0, 5).map((r) => `row ${r.row} (${r.reason.replace(/\.$/, "").toLowerCase()})`).join("; ")}
                {report.invalid.length > 5 ? "; and more." : "."}
              </span>
            )}
          </div>
        )}
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      </div>

      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this deck" aria-label="Search this deck" style={{ ...inputStyle, maxWidth: 360 }} />

      <div style={PANEL}>
        <div className="ln-deck-row ln-deck-head" style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>
          {match ? <><span>Phrase</span><span /></> : <><span>Callout</span><span>Song</span><span>Artist</span><span /></>}
        </div>
        {filtered.length === 0 && <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>{entries.length ? "Nothing matches that search." : "This deck is empty. Add lines above."}</p>}
        {filtered.map((e, i) =>
          editing?.id === e.id ? (
            <div key={e.id} className="ln-deck-row">
              <input aria-label="Line" value={editing.line} onChange={(ev) => setEditing({ ...editing, line: ev.target.value })} style={inputStyle} />
              {!match && (
                <>
                  <input aria-label="Song" value={editing.song ?? ""} onChange={(ev) => setEditing({ ...editing, song: ev.target.value })} style={inputStyle} />
                  <input aria-label="Artist" value={editing.artist ?? ""} onChange={(ev) => setEditing({ ...editing, artist: ev.target.value })} style={inputStyle} />
                </>
              )}
              <span style={{ display: "flex", gap: 4 }}>
                <button onClick={saveEdit} style={button("primary")}>Save</button>
                <button onClick={() => setEditing(null)} style={button("quiet")}>Cancel</button>
              </span>
            </div>
          ) : (
            <div key={e.id} className="ln-deck-row" style={{ opacity: e.active ? 1 : 0.5 }}>
              <span style={{ overflowWrap: "anywhere" }}>
                <span style={{ color: FAINT, marginRight: 8 }}>{query ? "" : `${i + 1}.`}</span>
                {e.line}
              </span>
              {!match && (
                <>
                  <span style={{ color: MUTED }}>{e.song}</span>
                  <span style={{ fontWeight: 600 }}>{e.artist}</span>
                </>
              )}
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
