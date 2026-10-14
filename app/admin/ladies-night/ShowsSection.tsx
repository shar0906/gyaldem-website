// admin/ladies-night/ShowsSection.tsx
//
// Shows: the list on the left (filtered by series), the editor in the
// middle, and a live preview of the gate on the right (People's Choice
// series). The editor only shows the parts the show's series uses.
// Every setting can change at any time; saves go live right away.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GatePreview } from "../../components/ln/PhonePreview";
import { easternInputToIso, isoToEasternInput, todayEastern } from "../../lib/ln/dates";
import { RUN_PLACEHOLDER, runToText, textToRun } from "../../lib/ln/run-text";
import { defaultSendAt, defaultTemplate } from "../../lib/ln/reminder-template";
import { formatDateTime } from "../artist/ui";
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
  selectStyle,
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
  venue_id: string | null;
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
  reminder_enabled: boolean;
  reminder_send_at: string | null;
  reminder_subject: string | null;
  reminder_body: string | null;
  reminder_broadcast_id: number | null;
  reminder_scheduled_at: string | null;
  reminder_error: string | null;
  series_id: string;
  dj_name: string | null;
  theme_name: string | null;
  bingo_deck_id: string | null;
  has_bingo: boolean;
  running_order: RunItem[];
  gallery_url: string | null;
  vip_closes_at: string | null;
  recap_emailed_at: string | null;
  series?: { id: string; name: string; slug: string } | null;
  stage: string;
  artist?: Artist | null;
  ballot?: { draft: number; published: number };
};
type SeriesOpt = {
  id: string;
  slug: string;
  name: string;
  primary_color: string | null;
  default_running_order: RunItem[];
  default_start_time: string | null;
  default_end_time: string | null;
  default_dj_name: string | null;
  default_bingo_deck_id: string | null;
  default_venue_id: string | null;
  feat_voting: boolean;
  feat_vip: boolean;
  feat_opentable: boolean;
  feat_reminder: boolean;
  feat_live: boolean;
  active: boolean;
};
type DeckOpt = { id: string; name: string; kind: string; lines: number; active: boolean };
type RunItem = { label: string; time: string | null };
type Recap = { rsvps: number; posh_opened: number; posh_confirmed: number; tables: number; checked_in: number; vip_passes: number; vip_revenue_cents: number; live_views: number; winners: string[] };
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
  venue_id: string;
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
  reminder_enabled: boolean;
  reminder_send_at: string;
  reminder_subject: string;
  reminder_body: string;
  series_id: string;
  dj_name: string;
  theme_name: string;
  bingo_deck_id: string;
  has_bingo: boolean;
  running_order: string; // one per line: "21:30 Bingo, round 1"
  gallery_url: string;
  vip_closes_at: string;
};


const MIN_SONGS = 10;
const DEFAULT_TITLE = "Ladies Night: An Ode To Her";

const PUBLISH_ERRORS: Record<string, string> = {
  no_artist: "Assign an artist first.",
  artist_not_approved: "The artist's profile hasn't been approved yet. Approve it under Approvals.",
  show_closed: "This show is archived or already past.",
};

function toForm(s: ShowRow, featVoting: boolean): Form {
  const t = defaultTemplate(featVoting);
  return {
    title: s.title,
    event_date: s.event_date,
    event_start_time: s.event_start_time.slice(0, 5),
    event_end_time: s.event_end_time.slice(0, 5),
    artist_id: s.artist_id ?? "",
    venue_id: s.venue_id ?? "",
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
    reminder_enabled: s.reminder_enabled,
    reminder_send_at: isoToEasternInput(s.reminder_send_at),
    reminder_subject: s.reminder_subject ?? t.subject,
    reminder_body: s.reminder_body ?? t.body,
    series_id: s.series_id,
    dj_name: s.dj_name ?? "",
    theme_name: s.theme_name ?? "",
    bingo_deck_id: s.bingo_deck_id ?? "",
    has_bingo: s.has_bingo,
    running_order: runToText(s.running_order),
    gallery_url: s.gallery_url ?? "",
    vip_closes_at: isoToEasternInput(s.vip_closes_at),
  };
}

function blankForm(
  suggestion: { event_date: string; voting_opens_at: string | null; voting_closes_at: string | null } | null,
  series: SeriesOpt | null
): Form {
  const voting = series?.feat_voting ?? true;
  const t = defaultTemplate(voting);
  const title = voting ? DEFAULT_TITLE : series?.name ?? DEFAULT_TITLE;
  return {
    title,
    event_date: suggestion?.event_date ?? "",
    event_start_time: series?.default_start_time?.slice(0, 5) ?? (voting ? "18:00" : "20:00"),
    event_end_time: series?.default_end_time?.slice(0, 5) ?? (voting ? "22:00" : "00:00"),
    artist_id: "",
    venue_id: series?.default_venue_id ?? "",
    gate_headline: voting ? DEFAULT_TITLE : "",
    gate_description: "",
    rsvp_opens_at: "",
    voting_opens_at: isoToEasternInput(suggestion?.voting_opens_at),
    voting_closes_at: isoToEasternInput(suggestion?.voting_closes_at),
    opentable_widget: "",
    vip_enabled: false,
    vip_price: "25",
    vip_cap: "24",
    vip_perks: "Wristband, skip the line, gift bag",
    reminder_enabled: true,
    reminder_send_at: "",
    reminder_subject: t.subject,
    reminder_body: t.body,
    series_id: series?.id ?? "",
    dj_name: series?.default_dj_name ?? "",
    theme_name: "",
    bingo_deck_id: series?.default_bingo_deck_id ?? "",
    has_bingo: !!series?.default_bingo_deck_id,
    running_order: runToText(series?.default_running_order),
    gallery_url: "",
    vip_closes_at: "",
  };
}

function toBody(f: Form, featVoting: boolean) {
  const t = defaultTemplate(featVoting);
  const price = Math.round(Number(f.vip_price) * 100);
  const body: Record<string, unknown> = {
    title: f.title,
    event_date: f.event_date,
    event_start_time: f.event_start_time,
    event_end_time: f.event_end_time,
    artist_id: f.artist_id || null,
    venue_id: f.venue_id || null,
    gate_headline: f.gate_headline || null,
    gate_description: f.gate_description || null,
    rsvp_opens_at: easternInputToIso(f.rsvp_opens_at),
    opentable_widget: f.opentable_widget || null,
    vip_enabled: f.vip_enabled,
    vip_perks: f.vip_perks || null,
    reminder_enabled: f.reminder_enabled,
    // Blank time means the default (6 PM the evening before); unchanged
    // template text is stored as "use the default."
    reminder_send_at: easternInputToIso(f.reminder_send_at),
    reminder_subject: f.reminder_subject.trim() === t.subject ? null : f.reminder_subject || null,
    reminder_body: f.reminder_body.trim() === t.body.trim() ? null : f.reminder_body || null,
    series_id: f.series_id,
    dj_name: f.dj_name || null,
    theme_name: f.theme_name || null,
    bingo_deck_id: f.bingo_deck_id || null,
    running_order: textToRun(f.running_order),
    has_bingo: f.has_bingo,
    gallery_url: f.gallery_url || null,
    vip_closes_at: easternInputToIso(f.vip_closes_at),
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
  const [paymentsMode, setPaymentsMode] = useState<"test" | "live" | null | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<Record<string, { event_date: string; voting_opens_at: string | null; voting_closes_at: string | null }>>({});
  const [artists, setArtists] = useState<ArtistFull[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string; active: boolean; opentable_widget: string | null }[]>([]);
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [show, setShow] = useState<ShowRow | null>(null);
  const [songs, setSongs] = useState<BallotSong[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [defaultVenue, setDefaultVenue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string; field?: string } | null>(null);
  const [seriesList, setSeriesList] = useState<SeriesOpt[]>([]);
  const [decks, setDecks] = useState<DeckOpt[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [recap, setRecap] = useState<Recap | null>(null);
  // openShow reads the latest series list without re-creating itself.
  const seriesRef = useRef<SeriesOpt[]>([]);
  const seriesOf = (id: string | null | undefined) => seriesList.find((x) => x.id === id) ?? null;

  const loadList = useCallback(async () => {
    const [list, people, places, deckRes] = await Promise.all([
      api<{ shows: ShowRow[]; series: SeriesOpt[]; suggestions?: typeof suggestions; payments_mode?: "test" | "live" | null; error?: string }>("/api/admin/ladies-night/shows"),
      api<{ artists: ArtistFull[] }>("/api/admin/ladies-night/artists"),
      api<{ venues: { id: string; name: string; active: boolean; opentable_widget: string | null }[] }>("/api/admin/ladies-night/venues"),
      api<{ decks: DeckOpt[] }>("/api/admin/ladies-night/bingo/decks"),
    ]);
    if (deckRes.ok) setDecks(deckRes.data.decks);
    if (!list.ok) {
      setLoadError(errorText(list.data));
      return null;
    }
    setShows(list.data.shows);
    setSeriesList(list.data.series ?? []);
    seriesRef.current = list.data.series ?? [];
    setSuggestions(list.data.suggestions ?? {});
    setPaymentsMode(list.data.payments_mode ?? null);
    if (people.ok) setArtists(people.data.artists);
    if (places.ok) {
      setVenues(places.data.venues);
      // New shows start at the only active venue, if there's just one.
      const active = places.data.venues.filter((v) => v.active);
      if (active.length === 1) setDefaultVenue(active[0].id);
    }
    return list.data.shows;
  }, []);

  const openShow = useCallback(async (id: string) => {
    setSelected(id);
    setNotice(null);
    const res = await api<{ show: ShowRow; songs: BallotSong[]; recap: Recap | null }>(`/api/admin/ladies-night/shows/${id}`);
    if (!res.ok) {
      setNotice({ tone: "error", text: errorText(res.data as { error?: string }) });
      return;
    }
    setShow(res.data.show);
    setSongs(res.data.songs);
    setRecap(res.data.recap);
    setForm(toForm(res.data.show, seriesRef.current.find((x) => x.id === res.data.show.series_id)?.feat_voting ?? true));
  }, []);


  useEffect(() => {
    loadList().then((list) => {
      const first = list?.find((s) => !s.archived);
      if (first) openShow(first.id);
    });
  }, [loadList, openShow]);

  // Switching series: keep the open show if it belongs, otherwise open
  // that series' next show, or nothing if it has none yet.
  const pickFilter = (id: string) => {
    setFilter(id);
    if (id === "all" || selected === "new") return;
    const current = (shows ?? []).find((x) => x.id === selected);
    if (current && current.series_id === id) return;
    const first = (shows ?? []).find((x) => x.series_id === id && !x.archived);
    if (first) {
      setForm(null);
      openShow(first.id);
    } else {
      setSelected(null);
      setShow(null);
      setForm(null);
      setSongs([]);
      setRecap(null);
      setNotice(null);
    }
  };

  const suggestionFor = (series: SeriesOpt | null) => (series?.feat_voting ? suggestions[series.id] ?? null : null);

  // Under "All series" a new show starts blank until a series is picked,
  // so nothing carries over from another series.
  const startNew = () => {
    const series = filter === "all" ? null : seriesList.find((x) => x.id === filter) ?? null;
    const f = blankForm(suggestionFor(series), series);
    setSelected("new");
    setShow(null);
    setSongs([]);
    setRecap(null);
    setForm({ ...f, venue_id: f.venue_id || defaultVenue });
    setNotice(null);
  };

  // Switching a new show's series resets the parts that depend on it.
  const changeSeries = (id: string) => {
    const series = seriesList.find((x) => x.id === id) ?? null;
    setForm((f) => {
      if (!f) return f;
      if (selected !== "new") return { ...f, series_id: id };
      const fresh = blankForm(suggestionFor(series), series);
      // Keep a date typed by hand, but not one suggested for the old series.
      const prev = seriesList.find((x) => x.id === f.series_id) ?? null;
      const typed = f.event_date && f.event_date !== suggestionFor(prev)?.event_date ? f.event_date : "";
      return { ...fresh, event_date: typed || fresh.event_date, venue_id: fresh.venue_id || defaultVenue };
    });
  };

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    if (notice?.field === key) setNotice(null);
  };

  async function save() {
    if (!form) return;
    const body = toBody(form, seriesOf(form.series_id)?.feat_voting ?? true);
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
  const formSeries = seriesOf(form?.series_id);
  const voting = formSeries?.feat_voting ?? true;
  const tpl = defaultTemplate(voting);
  const visibleShows = filter === "all" ? shows : shows.filter((x) => x.series_id === filter);
  const today = todayEastern();
  const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

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
      {seriesList.length > 1 && (
        <div role="tablist" aria-label="Series" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "-6px 0 18px" }}>
          {[{ id: "all", name: "All series" }, ...seriesList].map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={filter === x.id}
              onClick={() => pickFilter(x.id)}
              style={{ ...button(filter === x.id ? "primary" : "secondary"), padding: "8px 12px" }}
            >
              {x.name}
            </button>
          ))}
        </div>
      )}

      <div className="ln-shows">
        <nav aria-label="Shows" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleShows.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
                No {filter === "all" ? "" : `${seriesOf(filter)?.name ?? ""} `}shows yet.
              </p>
              <button onClick={startNew} style={button("secondary")}>+ New {filter === "all" ? "" : `${seriesOf(filter)?.name ?? ""} `}show</button>
            </div>
          )}
          {visibleShows.map((s, i) => {
            const active = s.id === selected;
            const isPast = s.archived || s.event_date < today;
            const prevPast = i > 0 && (visibleShows[i - 1].archived || visibleShows[i - 1].event_date < today);
            const heading = i === 0 ? (isPast ? "Past" : "Upcoming") : isPast && !prevPast ? "Past" : null;
            const color = seriesOf(s.series_id)?.primary_color ?? RED;
            // Sides set one by one: mixing the border shorthand with
            // borderLeft makes React drop the stripe when a card is deselected.
            const edge = active ? `1px solid ${RED}` : String(PANEL.border);
            return (
              <div key={s.id} style={{ display: "contents" }}>
              {heading && <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, marginTop: i === 0 ? 0 : 10 }}>{heading}</span>}
              <button
                onClick={() => {
                  if (s.id !== selected) setForm(null);
                  openShow(s.id);
                }}
                aria-current={active}
                style={{ ...PANEL, border: undefined, borderTop: edge, borderRight: edge, borderBottom: edge, borderLeft: `4px solid ${color}`, padding: "12px 14px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer", opacity: s.archived ? 0.6 : 1, fontFamily: "sans-serif", color: INK }}
              >
                {s.series && seriesList.length > 1 && (
                  <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color, fontWeight: 600 }}>{s.series.name}</span>
                )}
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
                  {showLabel({ event_date: s.event_date, artist: null }).split(" · ")[0]}
                </span>
                {seriesOf(s.series_id)?.feat_voting ?? true ? (
                  <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, color: s.artist ? INK : FAINT }}>{s.artist?.display_name ?? "No artist yet"}</span>
                ) : (
                  <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, color: INK }}>{s.theme_name ?? s.series?.name ?? s.title}</span>
                )}
                <StageChip stage={s.stage} />
              </button>
              </div>
            );
          })}
          {selected === "new" && (
            <div style={{ ...PANEL, border: `1px solid ${RED}`, padding: "12px 14px", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>New show</div>
          )}
        </nav>

        {form && selected === "new" && !form.series_id ? (
          <div style={{ ...PANEL, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={sectionLabel}>New show</p>
            <Field id="s-series-pick" label="Which series is it for?" hint="The show starts from that series' venue, times, DJ, bingo deck, and run of show.">
              <select id="s-series-pick" value="" onChange={(e) => changeSeries(e.target.value)} style={selectStyle}>
                <option value="">Pick a series…</option>
                {seriesList
                  .filter((x) => x.active)
                  .map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
              </select>
            </Field>
          </div>
        ) : form ? (
          <div style={{ ...PANEL, padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <p style={sectionLabel}>The show</p>
                {show && <StageChip stage={show.stage} />}
              </div>
              <Field id="s-series" label="Series" hint={selected !== "new" ? "A show can move to another series until someone RSVPs." : undefined}>
                <select id="s-series" value={form.series_id} onChange={(e) => changeSeries(e.target.value)} style={selectStyle}>
                  {seriesList
                    .filter((x) => x.active || x.id === form.series_id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                </select>
              </Field>
              {fieldErr("series_id")}
              {voting && (<>
              <Field id="s-artist" label="Artist" hint={selectedArtist && !selectedArtist.approved_at ? "This artist's profile isn't approved yet. You can book them, but publishing waits for approval." : undefined}>
                <select id="s-artist" value={form.artist_id} onChange={(e) => set("artist_id", e.target.value)} style={selectStyle}>
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
              </>)}
              <Field id="s-venue" label="Venue" hint={venues.length === 0 ? "Add venues under Ladies Night, Venues." : undefined}>
                <select id="s-venue" value={form.venue_id} onChange={(e) => set("venue_id", e.target.value)} style={selectStyle}>
                  <option value="">No venue yet</option>
                  {venues
                    .filter((v) => v.active || v.id === form.venue_id)
                    .map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
              </Field>
              {fieldErr("venue_id")}
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <Field id="s-dj" label="DJ / music by (optional)" hint="Shows as “Music by …” on the page.">
                  <input id="s-dj" value={form.dj_name} maxLength={80} onChange={(e) => set("dj_name", e.target.value)} placeholder="YouKnowMeAsDubzz" style={inputStyle} />
                </Field>
                <Field id="s-theme" label="Theme (optional)" hint="Like “Spooky Szn”. Shows on the page and the hub.">
                  <input id="s-theme" value={form.theme_name} maxLength={60} onChange={(e) => set("theme_name", e.target.value)} style={inputStyle} />
                </Field>
              </div>
              {fieldErr("dj_name")}
              {fieldErr("theme_name")}
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
                {voting && (<>
                <Field id="s-vo" label="Voting opens">
                  <input id="s-vo" type="datetime-local" value={form.voting_opens_at} onChange={(e) => set("voting_opens_at", e.target.value)} style={inputStyle} />
                </Field>
                <Field id="s-vc" label="Voting closes">
                  <input id="s-vc" type="datetime-local" value={form.voting_closes_at} onChange={(e) => set("voting_closes_at", e.target.value)} style={inputStyle} />
                </Field>
                </>)}
              </div>
              <span style={{ fontSize: 12, color: MUTED }}>
                Until RSVP opens, the series page shows a countdown. {selected === "new" && voting && "Leave voting blank to use the suggested window."}
              </span>
              {fieldErr("rsvp_opens_at")}
              {fieldErr("voting_opens_at")}
              {fieldErr("voting_closes_at")}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <p style={sectionLabel}>Show night</p>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.has_bingo}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setForm((f) => (f ? { ...f, has_bingo: on, bingo_deck_id: on ? f.bingo_deck_id || formSeries?.default_bingo_deck_id || "" : "" } : f));
                  }}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: RED, flex: "none" }}
                />
                <span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Bingo tonight</span>
                  <span style={{ display: "block", fontSize: 12, color: MUTED }}>3 rounds, any line. The host calls from the deck below.</span>
                </span>
              </label>
              {form.has_bingo && (
                <Field id="s-deck" label="Bingo deck">
                  <select id="s-deck" value={form.bingo_deck_id} onChange={(e) => set("bingo_deck_id", e.target.value)} style={selectStyle}>
                    <option value="">Pick a deck…</option>
                    {decks
                      .filter((d) => d.active || d.id === form.bingo_deck_id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name} · {d.lines} lines</option>
                      ))}
                  </select>
                </Field>
              )}
              {form.has_bingo && !form.bingo_deck_id && (
                <Notice tone="error">Pick a deck. The host can&apos;t tap We&apos;re live until this show has one.</Notice>
              )}
              {fieldErr("bingo_deck_id")}
              {(formSeries?.feat_live ?? true) && (
                <Field
                  id="s-run"
                  label="Run of show"
                  hint={
                    <>
                      One per line, with a 24-hour time in front if you like: “21:30 Bingo, round 1”. Shown on the live page; the host can edit it and mark what&apos;s on now. Leave it blank to use the series&apos; master run of show.{" "}
                      {!!formSeries?.default_running_order?.length && (
                        <button type="button" onClick={() => set("running_order", runToText(formSeries.default_running_order))} style={{ ...button("quiet"), padding: 0, textDecoration: "underline" }}>
                          Use the series default
                        </button>
                      )}
                    </>
                  }
                >
                  <textarea id="s-run" rows={5} value={form.running_order} onChange={(e) => set("running_order", e.target.value)} placeholder={RUN_PLACEHOLDER} style={{ ...inputStyle, lineHeight: 1.45, resize: "vertical" }} />
                </Field>
              )}
              {fieldErr("running_order")}
              <Field id="s-gallery" label="Photo gallery link (optional)" hint="Shows on the recap after the night.">
                <input id="s-gallery" value={form.gallery_url} maxLength={500} onChange={(e) => set("gallery_url", e.target.value.trim())} placeholder="https://" style={inputStyle} />
              </Field>
              {fieldErr("gallery_url")}
            </section>

            {(formSeries?.feat_opentable ?? true) && (
            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <p style={sectionLabel}>OpenTable</p>
              <Field
                id="s-ot"
                label="Override for this show (optional)"
                hint={
                  show?.opentable_widget ? (
                    <span style={{ color: GREEN }}>This show uses its own widget. Clear the box to use the venue&apos;s.</span>
                  ) : venues.find((v) => v.id === form.venue_id)?.opentable_widget ? (
                    "Using the venue's widget. Paste a different code here only if this show needs its own, like a special-event widget."
                  ) : (
                    "Neither this show nor its venue has a widget yet. Add it on the venue, or paste one here for this show only."
                  )
                }
              >
                <textarea id="s-ot" rows={2} value={form.opentable_widget} onChange={(e) => set("opentable_widget", e.target.value)} placeholder="Paste the special-event widget code" style={{ ...inputStyle, fontFamily: "Menlo, Consolas, monospace", fontSize: 12, resize: "vertical" }} />
              </Field>
              {fieldErr("opentable_widget")}
            </section>
            )}

            {(formSeries?.feat_vip ?? true) && (
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
                  <Field id="s-vip-close" label="Sales close (Eastern)" hint="Leave blank for 48 hours before the show.">
                    <input id="s-vip-close" type="datetime-local" value={form.vip_closes_at} onChange={(e) => set("vip_closes_at", e.target.value)} style={{ ...inputStyle, maxWidth: 280 }} />
                  </Field>
                  <span style={{ fontSize: 12, color: MUTED }}>Up to 5 per guest. Sales close at the time above or at the cap, whichever comes first. Payments go to Gyal Dem&apos;s Stripe.</span>
                  {paymentsMode === "test" && (
                    <Notice tone="error">Stripe is in test mode: guests can&apos;t really pay. Set STRIPE_MODE to live in Railway before sharing the link.</Notice>
                  )}
                  {paymentsMode === null && (
                    <Notice tone="error">Stripe isn&apos;t set up, so VIP checkout won&apos;t open. Add the Stripe keys in Railway.</Notice>
                  )}
                  {paymentsMode === "live" && <span style={{ fontSize: 12, color: GREEN }}>Stripe is live: payments are real.</span>}
                </>
              )}
              {fieldErr("vip_price_cents")}
              {fieldErr("vip_cap")}
              {fieldErr("vip_perks")}
              {fieldErr("vip_closes_at")}
            </section>
            )}

            {(formSeries?.feat_reminder ?? true) && (
            <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: LINE }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.reminder_enabled} onChange={(e) => set("reminder_enabled", e.target.checked)} style={{ width: 18, height: 18, accentColor: RED }} />
                <span style={sectionLabel}>Reminder email (sent through Kit)</span>
              </label>
              {form.reminder_enabled && (
                <>
                  <span style={{ fontSize: 12, color: show?.reminder_error ? RED : show?.reminder_broadcast_id ? GREEN : MUTED }}>
                    {show?.reminder_error
                      ? show.reminder_error
                      : show?.reminder_broadcast_id && show.reminder_scheduled_at
                        ? `Scheduled in Kit (last synced ${formatDateTime(show.reminder_scheduled_at)}). Edits here update it within the hour.`
                        : "Goes to everyone RSVP'd to this show. It's handed to Kit automatically in the week before it sends."}
                  </span>
                  <Field
                    id="s-rem-at"
                    label="Sends (Eastern)"
                    hint={form.event_date ? `Leave blank for the default: ${formatDateTime(defaultSendAt(form.event_date))}.` : "Leave blank for 6 PM the evening before."}
                  >
                    <input id="s-rem-at" type="datetime-local" value={form.reminder_send_at} onChange={(e) => set("reminder_send_at", e.target.value)} style={{ ...inputStyle, maxWidth: 280 }} />
                  </Field>
                  <Field id="s-rem-subject" label="Subject">
                    <input id="s-rem-subject" value={form.reminder_subject} maxLength={150} onChange={(e) => set("reminder_subject", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field
                    id="s-rem-body"
                    label="Message"
                    hint="{series}, {artist}, {dj}, {date}, {time}, {venue}, {link} (the series page), and {live} (the live page) fill in from the show. Leave a blank line between paragraphs."
                  >
                    <textarea id="s-rem-body" rows={10} maxLength={5000} value={form.reminder_body} onChange={(e) => set("reminder_body", e.target.value)} style={{ ...inputStyle, lineHeight: 1.5, resize: "vertical" }} />
                  </Field>
                  {(form.reminder_subject !== tpl.subject || form.reminder_body.trim() !== tpl.body.trim()) && (
                    <button
                      onClick={() => setForm((f) => (f ? { ...f, reminder_subject: tpl.subject, reminder_body: tpl.body } : f))}
                      style={{ ...button("quiet"), alignSelf: "flex-start", padding: "4px 0" }}
                    >
                      Reset to the default template
                    </button>
                  )}
                </>
              )}
              {fieldErr("reminder_send_at")}
              {fieldErr("reminder_subject")}
              {fieldErr("reminder_body")}
            </section>
            )}

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

            {show && recap && (
              <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 20, borderTop: LINE }}>
                <p style={sectionLabel}>Recap {show.recap_emailed_at ? `(emailed ${formatDateTime(show.recap_emailed_at)})` : "(emailed to the client the day after)"}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, fontSize: 13 }}>
                  {[
                    ["RSVPs", recap.rsvps],
                    ...(formSeries?.feat_vip ?? true ? [["VIP passes", `${recap.vip_passes}${recap.vip_passes ? ` (${money(recap.vip_revenue_cents)})` : ""}`]] : []),
                    ["Tables booked", recap.tables],
                    ["Posh opened", recap.posh_opened],
                    ["Posh confirmed", recap.posh_confirmed],
                    ["Checked in", recap.checked_in],
                    ["Live page visits", recap.live_views],
                  ].map(([k, v]) => (
                    <div key={k as string} style={{ border: LINE, padding: "8px 10px" }}>
                      <div style={{ color: MUTED, fontSize: 11 }}>{k}</div>
                      <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {recap.winners.length > 0 && <span style={{ fontSize: 13 }}>Winners: {recap.winners.join(" · ")}</span>}
              </section>
            )}

            {show && voting && (
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
                {!published && show.stage === "voting_open" && (
                  <Notice tone="error">Voting is open but the ballot isn&apos;t published, so guests can only RSVP for now. Publish to let them vote.</Notice>
                )}
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
          <div style={{ ...PANEL, padding: 24, color: MUTED, fontSize: 14 }}>
            {selected ? "Loading show…" : "Pick a show, or create a new one."}
          </div>
        )}

        {form && !voting && formSeries && (
          <aside className="ln-shows-preview" style={{ ...PANEL, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED }}>{formSeries.name}</span>
            <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>The page uses the series&apos; logos, cover photo, and colors (set under Series), with this show&apos;s date, theme, and DJ.</span>
            <a href={`/ladies-night/${formSeries.slug}`} target="_blank" rel="noopener" style={button("secondary")}>Open the page ↗</a>
            <a href={`/ladies-night/${formSeries.slug}/live`} target="_blank" rel="noopener" style={button("quiet")}>Open the live page ↗</a>
          </aside>
        )}
        {form && voting && formSeries && (
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
