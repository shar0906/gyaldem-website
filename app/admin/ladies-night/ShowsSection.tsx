// admin/ladies-night/ShowsSection.tsx
//
// Shows: the list on the left, the editor in the middle, and a live
// preview of the gate on the right. Every setting can change at any
// time; saves go live right away.

"use client";

import { useCallback, useEffect, useState } from "react";
import { GatePreview } from "../../components/ln/PhonePreview";
import { easternInputToIso, isoToEasternInput } from "../../lib/ln/dates";
import {
  FAINT,
  Field,
  GREEN,
  H1,
  INK,
  LINE,
  MUTED,
  Notice,
  PANEL,
  RED,
  StageChip,
  api,
  button,
  errorText,
  inputStyle,
  sectionLabel,
  showLabel,
} from "./kit";

type Artist = { id: string; display_name: string; approved_at: string | null; active: boolean };
type ArtistFull = Artist & {
  bio: string | null;
  instagram_handle: string | null;
  primary_color: string | null;
  accent_color: string | null;
  photo_url: string | null;
  cover_url: string | null;
};
type ShowRow = {
  id: string;
  title: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  artist_id: string | null;
  gate_headline: string | null;
  gate_description: string | null;
  rsvp_opens_at: string | null;
  voting_opens_at: string;
  voting_closes_at: string;
  opentable_widget: string | null;
  vip_enabled: boolean;
  vip_price_cents: number;
  vip_perks: string | null;
  vip_cap: number;
  archived: boolean;
  stage: string;
  artist?: Artist | null;
  ballot?: { draft: number; published: number };
};
type BallotSong = {
  song_id: string;
  status: "draft" | "published";
  votes: number;
  ln_repertoire: { title: string; artist: string } | null;
};
type Form = {
  title: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  artist_id: string;
  gate_headline: string;
  gate_description: string;
  rsvp_opens_at: string;
  voting_opens_at: string;
  voting_closes_at: string;
  opentable_widget: string;
  vip_enabled: boolean;
  vip_price: string;
  vip_cap: string;
  vip_perks: string;
};

const MIN_SONGS = 10;
const DEFAULT_TITLE = "Ladies Night: An Ode To Her";

const PUBLISH_ERRORS: Record<string, string> = {
  no_artist: "Assign an artist first.",
  artist_not_approved: "The artist's profile hasn't been approved yet. Approve it under Approvals.",
  show_closed: "This show is archived or already past.",
};

function toForm(s: ShowRow): Form {
  return {
    title: s.title,
    event_date: s.event_date,
    event_start_time: s.event_start_time.slice(0, 5),
    event_end_time: s.event_end_time.slice(0, 5),
    artist_id: s.artist_id ?? "",
    gate_headline: s.gate_headline ?? "",
    gate_description: s.gate_description ?? "",
    rsvp_opens_at: isoToEasternInput(s.rsvp_opens_at),
    voting_opens_at: isoToEasternInput(s.voting_opens_at),
    voting_closes_at: isoToEasternInput(s.voting_closes_at),
    opentable_widget: s.opentable_widget ?? "",
    vip_enabled: s.vip_enabled,
    vip_price: (s.vip_price_cents / 100).toFixed(2).replace(/\.00$/, ""),
    vip_cap: String(s.vip_cap),
    vip_perks: s.vip_perks ?? "",
  };
}

function blankForm(suggestion: { event_date: string; voting_opens_at: string | null; voting_closes_at: string | null } | null): Form {
  return {
    title: DEFAULT_TITLE,
    event_date: suggestion?.event_date ?? "",
    event_start_time: "18:00",
    event_end_time: "22:00",
    artist_id: "",
    gate_headline: DEFAULT_TITLE,
    gate_description: "",
    rsvp_opens_at: "",
    voting_opens_at: isoToEasternInput(suggestion?.voting_opens_at),
    voting_closes_at: isoToEasternInput(suggestion?.voting_closes_at),
    opentable_widget: "",
    vip_enabled: false,
    vip_price: "25",
    vip_cap: "24",
    vip_perks: "Wristband, skip the line, gift bag",
  };
}

function toBody(f: Form) {
  const price = Math.round(Number(f.vip_price) * 100);
  const body: Record<string, unknown> = {
    title: f.title,
    event_date: f.event_date,
    event_start_time: f.event_start_time,
    event_end_time: f.event_end_time,
    artist_id: f.artist_id || null,
    gate_headline: f.gate_headline || null,
    gate_description: f.gate_description || null,
    rsvp_opens_at: easternInputToIso(f.rsvp_opens_at),
    opentable_widget: f.opentable_widget || null,
    vip_enabled: f.vip_enabled,
    vip_perks: f.vip_perks || null,
  };
  // VIP numbers only go out when filled in; a blank price on a show
  // without VIP shouldn't block saving.
  const cap = Number.parseInt(f.vip_cap, 10);
  if (f.vip_price.trim() !== "" || f.vip_enabled) body.vip_price_cents = Number.isFinite(price) ? price : -1;
  if (f.vip_cap.trim() !== "" || f.vip_enabled) body.vip_cap = Number.isFinite(cap) ? cap : -1;
  const opens = easternInputToIso(f.voting_opens_at);
  const closes = easternInputToIso(f.voting_closes_at);
  if (opens) body.voting_opens_at = opens;
  if (closes) body.voting_closes_at = closes;
  return body;
}

export default function ShowsSection() {
  const [shows, setShows] = useState<ShowRow[] | null>(null);
  const [suggestion, setSuggestion] = useState<{ event_date: string; voting_opens_at: string | null; voting_closes_at: string | null } | null>(null);
  const [artists, setArtists] = useState<ArtistFull[]>([]);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [show, setShow] = useState<ShowRow | null>(null);
  const [songs, setSongs] = useState<BallotSong[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string; field?: string } | null>(null);

  const loadList = useCallback(async () => {
    const [list, people] = await Promise.all([
      api<{ shows: ShowRow[]; suggestion: typeof suggestion; error?: string }>("/api/admin/ladies-night/shows"),
      api<{ artists: ArtistFull[] }>("/api/admin/ladies-night/artists"),
    ]);
    if (!list.ok) {
      setLoadError(errorText(list.data));
      return null;
    }
    setShows(list.data.shows);
    setSuggestion(list.data.suggestion);
    if (people.ok) setArtists(people.data.artists);
    return list.data.shows;
  }, []);

  const openShow = useCallback(async (id: string) => {
    setSelected(id);
    setNotice(null);
    const res = await api<{ show: ShowRow; songs: BallotSong[] }>(`/api/admin/ladies-night/shows/${id}`);
    if (!res.ok) {
      setNotice({ tone: "error", text: errorText(res.data as { error?: string }) });
      return;
    }
    setShow(res.data.show);
    setSongs(res.data.songs);
    setForm(toForm(res.data.show));
  }, []);

  useEffect(() => {
    loadList().then((list) => {
      const first = list?.find((s) => !s.archived);
      if (first) openShow(first.id);
    });
  }, [loadList, openShow]);

  const startNew = () => {
    setSelected("new");
    setShow(null);
    setSongs([]);
    setForm(blankForm(suggestion));
    setNotice(null);
  };

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    if (notice?.field === key) setNotice(null);
  };

  async function save() {
    if (!form) return;
    const body = toBody(form);
    if (selected !== "new" && show && form.artist_id !== (show.artist_id ?? "") && songs.some((s) => s.status === "draft")) {
      if (!confirm("Changing the artist removes the songs the current artist proposed for this show. Continue?")) return;
    }
    setBusy("save");
    setNotice(null);
    const res =
      selected === "new"
        ? await api<{ show?: ShowRow; error?: string; field?: string; message?: string; drafts_cleared?: number }>("/api/admin/ladies-night/shows", { method: "POST", body })
        : await api<{ show?: ShowRow; error?: string; field?: string; message?: string; drafts_cleared?: number }>(`/api/admin/ladies-night/shows/${selected}`, { method: "PATCH", body });
    setBusy(null);
    if (!res.ok) {
      const text = res.data.error === "ballot_published" ? "The ballot is published, so the artist can't change now." : errorText(res.data);
      setNotice({ tone: "error", text, field: res.data.field });
      return;
    }
    const saved = res.data.show!;
    await loadList();
    await openShow(saved.id);
    setNotice({ tone: "ok", text: selected === "new" ? "Show created." : "Saved. Changes are live." });
  }

  async function publish() {
    if (!show) return;
    if (!confirm("Publish this ballot? Guests can vote once voting opens, and the list can't change after this.")) return;
    setBusy("publish");
    const res = await api<{ error?: string; have?: number; need?: number; published?: number }>(`/api/admin/ladies-night/shows/${show.id}/publish`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      const e = res.data.error ?? "";
      setNotice({ tone: "error", text: e === "not_enough_songs" ? `The ballot needs at least ${res.data.need} songs; it has ${res.data.have}.` : PUBLISH_ERRORS[e] ?? errorText(res.data) });
      return;
    }
    await openShow(show.id);
    await loadList();
    setNotice({ tone: "ok", text: `Published ${res.data.published} songs. The show is also live on the Events page.` });
  }

  async function copyForward() {
    if (!show) return;
    setBusy("copy");
    const res = await api<{ copied?: number; error?: string }>(`/api/admin/ladies-night/shows/${show.id}/copy-forward`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      setNotice({ tone: "error", text: res.data.error === "no_artist" ? "Assign an artist first." : errorText(res.data) });
      return;
    }
    await openShow(show.id);
    setNotice({ tone: "ok", text: res.data.copied ? `Copied ${res.data.copied} songs from the artist's last show.` : "This artist has no earlier show to copy from." });
  }

  async function toggleArchive() {
    if (!show) return;
    const next = !show.archived;
    if (next && !confirm("Archive this show? It disappears from the ballot page and artist dashboards. You can unarchive it later.")) return;
    setBusy("archive");
    const res = await api(`/api/admin/ladies-night/shows/${show.id}`, { method: "PATCH", body: { archived: next } });
    setBusy(null);
    if (!res.ok) {
      setNotice({ tone: "error", text: errorText(res.data) });
      return;
    }
    await loadList();
    await openShow(show.id);
  }

  if (loadError) {
    return (
      <div>
        <H1>Shows</H1>
        <Notice tone="error">{loadError}</Notice>
      </div>
    );
  }
  if (!shows) return <p style={{ color: FAINT, fontSize: 14 }}>Loading shows…</p>;

  const selectedArtist = artists.find((a) => a.id === form?.artist_id) ?? null;
  const published = songs.some((s) => s.status === "published");
  const drafts = songs.filter((s) => s.status === "draft").length;
  const canPublish = !!show && !published && drafts >= MIN_SONGS && !!selectedArtist?.approved_at && show.artist_id === form?.artist_id;
  const fieldErr = (f: string) => (notice?.tone === "error" && notice.field === f ? <Notice tone="error">{notice.text}</Notice> : null);

  return (
    <div>
      <style>{`
        .ln-shows{ display:grid; grid-template-columns:240px minmax(0,1fr) 300px; gap:24px; align-items:start; }
        .ln-grid-3{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
        .ln-vip-grid{ display:grid; grid-template-columns:140px 140px minmax(0,1fr); gap:12px; }
        @media (max-width: 1180px){ .ln-shows{ grid-template-columns:220px minmax(0,1fr); } .ln-shows-preview{ grid-column:1 / -1; } }
        @media (max-width: 760px){ .ln-shows{ grid-template-columns:1fr; } .ln-grid-3{ grid-template-columns:1fr; } .ln-vip-grid{ grid-template-columns:1fr 1fr; } .ln-vip-grid > :last-child{ grid-column:1 / -1; } }
      `}</style>
      <H1 action={<button onClick={startNew} style={button("primary")}>+ New show</button>}>Shows</H1>

      <div className="ln-shows">
        <nav aria-label="Shows" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shows.length === 0 && <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No shows yet. Create the first one.</p>}
          {shows.map((s) => {
            const active = s.id === selected;
            return (
              <button
                key={s.id}
                onClick={() => openShow(s.id)}
                aria-current={active}
                style={{ ...PANEL, border: active ? `1px solid ${RED}` : PANEL.border, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer", opacity: s.archived ? 0.6 : 1, fontFamily: "sans-serif", color: INK }}
              >
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{showLabel({ event_date: s.event_date, artist: null }).split(" · ")[0]}</span>
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, color: s.artist ? INK : FAINT }}>{s.artist?.display_name ?? "No artist yet"}</span>
                <StageChip stage={s.stage} />
              </button>
            );
          })}
          {selected === "new" && (
            <div style={{ ...PANEL, border: `1px solid ${RED}`, padding: "12px 14px", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>New show</div>
          )}
        </nav>

        {form ? (
          <div style={{ ...PANEL, padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <p style={sectionLabel}>The show</p>
                {show && <StageChip stage={show.stage} />}
              </div>
              <Field id="s-artist" label="Artist" hint={selectedArtist && !selectedArtist.approved_at ? "This artist's profile isn't approved yet. You can book them, but publishing waits for approval." : undefined}>
                <select id="s-artist" value={form.artist_id} onChange={(e) => set("artist_id", e.target.value)} style={inputStyle}>
                  <option value="">Leave unassigned</option>
                  {artists
                    .filter((a) => a.active || a.id === form.artist_id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.display_name} · {a.approved_at ? "approved" : "not approved yet"}
                      </option>
                    ))}
                </select>
              </Field>
              {fieldErr("artist_id")}
              <Field id="s-title" label="Title">
                <input id="s-title" value={form.title} onChange={(e) => set("title", e.target.value)} style={inputStyle} />
              </Field>
              <div className="ln-grid-3">
                <Field id="s-date" label="Date">
                  <input id="s-date" type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} style={inputStyle} />
                </Field>
                <Field id="s-start" label="Starts (Eastern)">
                  <input id="s-start" type="time" value={form.event_start_time} onChange={(e) => set("event_start_time", e.target.value)} style={inputStyle} />
                </Field>
                <Field id="s-end" label="Ends (Eastern)">
                  <input id="s-end" type="time" value={form.event_end_time} onChange={(e) => set("event_end_time", e.target.value)} style={inputStyle} />
                </Field>
              </div>
              {fieldErr("event_date")}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <p style={sectionLabel}>Sign-in page copy, shown in the preview as you type</p>
              <Field id="s-head" label="Headline">
                <input id="s-head" value={form.gate_headline} maxLength={120} onChange={(e) => set("gate_headline", e.target.value)} style={inputStyle} />
              </Field>
              <Field id="s-desc" label={`Description (${form.gate_description.length}/600)`}>
                <textarea id="s-desc" rows={3} maxLength={600} value={form.gate_description} onChange={(e) => set("gate_description", e.target.value)} style={{ ...inputStyle, lineHeight: 1.45, resize: "vertical" }} />
              </Field>
              {fieldErr("gate_headline")}
              {fieldErr("gate_description")}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <p style={sectionLabel}>Timing (Eastern)</p>
              <div className="ln-grid-3">
                <Field id="s-rsvp" label="RSVP opens">
                  <input id="s-rsvp" type="datetime-local" value={form.rsvp_opens_at} onChange={(e) => set("rsvp_opens_at", e.target.value)} style={inputStyle} />
                </Field>
                <Field id="s-vo" label="Voting opens">
                  <input id="s-vo" type="datetime-local" value={form.voting_opens_at} onChange={(e) => set("voting_opens_at", e.target.value)} style={inputStyle} />
                </Field>
                <Field id="s-vc" label="Voting closes">
                  <input id="s-vc" type="datetime-local" value={form.voting_closes_at} onChange={(e) => set("voting_closes_at", e.target.value)} style={inputStyle} />
                </Field>
              </div>
              <span style={{ fontSize: 12, color: MUTED }}>
                Until RSVP opens, /ladies-night shows a countdown. {selected === "new" && "Leave voting blank to use the suggested window."}
              </span>
              {fieldErr("rsvp_opens_at")}
              {fieldErr("voting_opens_at")}
              {fieldErr("voting_closes_at")}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <p style={sectionLabel}>OpenTable</p>
              <Field id="s-ot" label="Widget code from BCH" hint={show?.opentable_widget ? <span style={{ color: GREEN }}>Saved. Only the OpenTable link is kept from what you paste.</span> : "Paste the code OpenTable gives BCH. Only the opentable.com link inside it is kept."}>
                <textarea id="s-ot" rows={2} value={form.opentable_widget} onChange={(e) => set("opentable_widget", e.target.value)} placeholder="Paste the special-event widget code" style={{ ...inputStyle, fontFamily: "Menlo, Consolas, monospace", fontSize: 12, resize: "vertical" }} />
              </Field>
              {fieldErr("opentable_widget")}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.vip_enabled} onChange={(e) => set("vip_enabled", e.target.checked)} style={{ width: 18, height: 18, accentColor: RED }} />
                <span style={sectionLabel}>Offer VIP</span>
              </label>
              {form.vip_enabled && (
                <>
                  <div className="ln-vip-grid">
                    <Field id="s-price" label="Price per pass ($)">
                      <input id="s-price" inputMode="decimal" value={form.vip_price} onChange={(e) => set("vip_price", e.target.value)} style={inputStyle} />
                    </Field>
                    <Field id="s-cap" label="Total cap">
                      <input id="s-cap" inputMode="numeric" value={form.vip_cap} onChange={(e) => set("vip_cap", e.target.value)} style={inputStyle} />
                    </Field>
                    <Field id="s-perks" label="Perks">
                      <input id="s-perks" value={form.vip_perks} maxLength={300} onChange={(e) => set("vip_perks", e.target.value)} style={inputStyle} />
                    </Field>
                  </div>
                  <span style={{ fontSize: 12, color: MUTED }}>Up to 5 per guest. Sales close 48 hours before the show or at the cap, whichever comes first.</span>
                </>
              )}
              {fieldErr("vip_price_cents")}
              {fieldErr("vip_cap")}
              {fieldErr("vip_perks")}
            </section>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 20, borderTop: LINE }}>
              <button onClick={save} disabled={busy !== null} style={button("primary", busy === null)}>
                {busy === "save" ? "Saving…" : selected === "new" ? "Create show" : "Save changes"}
              </button>
              {show && (
                <button onClick={toggleArchive} disabled={busy !== null} style={button("quiet", busy === null)}>
                  {show.archived ? "Unarchive" : "Archive"}
                </button>
              )}
            </div>
            {notice && !notice.field && <Notice tone={notice.tone}>{notice.text}</Notice>}

            {show && (
              <section style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 20, borderTop: LINE }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <p style={sectionLabel}>Ballot {published ? "(published)" : `(${drafts} proposed, ${MIN_SONGS} needed)`}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!published && (
                      <button onClick={copyForward} disabled={busy !== null || !show.artist_id} style={button("quiet", busy === null && !!show.artist_id)}>
                        {busy === "copy" ? "Copying…" : "Copy from artist's last show"}
                      </button>
                    )}
                    {!published && (
                      <button onClick={publish} disabled={!canPublish || busy !== null} style={button("secondary", canPublish && busy === null)}>
                        {busy === "publish" ? "Publishing…" : "Publish ballot"}
                      </button>
                    )}
                  </div>
                </div>
                {!published && !canPublish && (
                  <span style={{ fontSize: 12, color: MUTED }}>
                    {!show.artist_id
                      ? "Assign an artist to start the ballot."
                      : show.artist_id !== form.artist_id
                        ? "Save the artist change first."
                        : !selectedArtist?.approved_at
                          ? "Publishing waits for the artist's profile to be approved."
                          : `The artist has proposed ${drafts} of the ${MIN_SONGS} songs needed.`}
                  </span>
                )}
                {songs.length === 0 ? (
                  <p style={{ fontSize: 13, color: FAINT, margin: 0 }}>No songs yet. The artist proposes them from their dashboard.</p>
                ) : (
                  <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {songs.map((s, i) => (
                      <li key={s.song_id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: LINE, fontSize: 14, alignItems: "baseline" }}>
                        <span style={{ color: FAINT, width: 22 }}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {s.ln_repertoire?.title} <span style={{ color: MUTED }}>· {s.ln_repertoire?.artist}</span>
                        </span>
                        {published && <span style={{ fontSize: 13, color: MUTED }}>{s.votes} vote{s.votes === 1 ? "" : "s"}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
          </div>
        ) : (
          <div style={{ ...PANEL, padding: 24, color: MUTED, fontSize: 14 }}>Pick a show, or create a new one.</div>
        )}

        {form && (
          <aside className="ln-shows-preview" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <span style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED }}>Live preview · sign-in page</span>
            <GatePreview
              headline={form.gate_headline}
              description={form.gate_description}
              profile={{
                display_name: selectedArtist?.display_name ?? "Artist",
                bio: selectedArtist?.bio ?? null,
                instagram_handle: selectedArtist?.instagram_handle ?? null,
                primary_color: selectedArtist?.primary_color ?? null,
                accent_color: selectedArtist?.accent_color ?? null,
                photo_url: selectedArtist?.photo_url ?? null,
                cover_url: selectedArtist?.cover_url ?? null,
              }}
            />
            {!selectedArtist && <span style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>Assign an artist to see their cover photo and colors.</span>}
          </aside>
        )}
      </div>
    </div>
  );
}
