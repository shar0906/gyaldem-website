// admin/ladies-night/SeriesSection.tsx
//
// Series: the recurring nights, each with its own page at
// /ladies-night/<link>. Set the client and venue, the event logos and
// cover photo, colors, the parts of the guest flow that are on, the Posh
// link, and the bingo call delay. Print the table placard (a QR code to
// the series' live page) from here.

"use client";

import { useCallback, useEffect, useState } from "react";
import ImageSlot from "./ImageSlot";
import { FAINT, Field, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, api, button, errorText, inputStyle, sectionLabel, selectStyle } from "./kit";

type Series = {
  id: string;
  slug: string;
  name: string;
  client_id: string | null;
  default_venue_id: string | null;
  title_logo_url: string | null;
  presents_logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  tagline: string | null;
  schedule_note: string | null;
  feat_voting: boolean;
  feat_vip: boolean;
  feat_opentable: boolean;
  feat_door: boolean;
  feat_posh: boolean;
  feat_live: boolean;
  feat_reminder: boolean;
  posh_url: string | null;
  call_delay_seconds: number;
  sort_order: number;
  active: boolean;
  upcoming_shows: number;
};
type Option = { id: string; name: string; active?: boolean };

const FEATURES: { key: keyof Series; label: string; help: string }[] = [
  { key: "feat_voting", label: "People's Choice + artist", help: "An artist each show, and guests vote the set list." },
  { key: "feat_vip", label: "VIP", help: "Paid VIP passes (set per show), through Gyal Dem's Stripe." },
  { key: "feat_opentable", label: "OpenTable", help: "Guests book a table without leaving the page." },
  { key: "feat_posh", label: "Posh step", help: "After RSVP, guests confirm on the Posh link below." },
  { key: "feat_door", label: "Door check-in", help: "The door QR and check-in screen on show night." },
  { key: "feat_live", label: "Live page", help: "Announcements, bingo calls, winners, and the running order." },
  { key: "feat_reminder", label: "Reminder email", help: "The day-before email through Kit." },
];

type Form = Omit<Series, "id" | "title_logo_url" | "presents_logo_url" | "cover_url" | "upcoming_shows">;

const blank: Form = {
  slug: "",
  name: "",
  client_id: null,
  default_venue_id: null,
  primary_color: "#6E1420",
  accent_color: "#C81E3A",
  tagline: "",
  schedule_note: "",
  feat_voting: false,
  feat_vip: false,
  feat_opentable: true,
  feat_door: false,
  feat_posh: false,
  feat_live: true,
  feat_reminder: true,
  posh_url: "",
  call_delay_seconds: 5,
  sort_order: 10,
  active: true,
};

function toForm(s: Series): Form {
  const { id: _id, title_logo_url: _t, presents_logo_url: _p, cover_url: _c, upcoming_shows: _u, ...rest } = s;
  return { ...rest, tagline: s.tagline ?? "", schedule_note: s.schedule_note ?? "", posh_url: s.posh_url ?? "" };
}

export default function SeriesSection() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [clients, setClients] = useState<Option[]>([]);
  const [venues, setVenues] = useState<Option[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [s, v] = await Promise.all([
      api<{ series: Series[]; clients: Option[] }>("/api/admin/ladies-night/series"),
      api<{ venues: Option[] }>("/api/admin/ladies-night/venues"),
    ]);
    if (!s.ok) return setLoadError(errorText(s.data as unknown as { error?: string }));
    setSeries(s.data.series);
    setClients(s.data.clients);
    if (v.ok) setVenues(v.data.venues);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) return <div><H1>Series</H1><Notice tone="error">{loadError}</Notice></div>;
  if (!series) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;
  const current = series.find((s) => s.id === editing) ?? null;

  return (
    <div>
      <style>{`
        .ln-series-row{ display:grid; grid-template-columns:150px minmax(0,1.4fr) minmax(0,1fr) 110px auto; gap:16px; align-items:center; padding:14px 20px; border-bottom:${LINE}; }
        @media (max-width: 900px){ .ln-series-row{ grid-template-columns:1fr; gap:6px; } .ln-series-head{ display:none !important; } }
      `}</style>
      <H1 action={<button onClick={() => setEditing(editing === "new" ? null : "new")} style={button("primary")}>{editing === "new" ? "Close" : "+ New series"}</button>}>Series</H1>
      <p style={{ margin: "-8px 0 18px", fontSize: 14, color: MUTED, maxWidth: 760 }}>
        Each series has its own page at gyaldemsocialclub.com/ladies-night/<i>link</i>, and its own live page for the table QR. Shows belong to a series.
      </p>
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      {editing === "new" && (
        <SeriesForm
          series={null}
          clients={clients}
          venues={venues}
          onSaved={(text, id) => {
            setNotice({ tone: "ok", text });
            load().then(() => setEditing(id ?? null));
          }}
        />
      )}

      <div style={PANEL}>
        <div className="ln-series-row ln-series-head" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED, padding: "12px 20px" }}>
          <span>Title logo</span><span>Series</span><span>Presented by</span><span>Upcoming</span><span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {series.map((s) => (
          <div key={s.id} className="ln-series-row" style={{ opacity: s.active ? 1 : 0.55 }}>
            <span style={{ width: 130, height: 52, background: s.title_logo_url ? `center / contain no-repeat url("${s.title_logo_url}"), ${s.primary_color ?? "#2A1416"}` : s.primary_color ?? "#EFE8DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
              {!s.title_logo_url && "No logo"}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>{s.name}</span>
              <a href={`/ladies-night/${s.slug}`} target="_blank" rel="noopener" style={{ fontSize: 12, color: RED, textDecoration: "none" }}>/ladies-night/{s.slug} ↗</a>
            </span>
            <span style={{ fontSize: 13 }}>{clients.find((c) => c.id === s.client_id)?.name ?? <span style={{ color: FAINT }}>Gyal Dem</span>}</span>
            <span style={{ fontSize: 13 }}>{s.upcoming_shows ? `${s.upcoming_shows} show${s.upcoming_shows === 1 ? "" : "s"}` : <span style={{ color: FAINT }}>None</span>}</span>
            <span style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setEditing(editing === s.id ? null : s.id)} style={button("quiet")}>{editing === s.id ? "Close" : "Edit"}</button>
            </span>
          </div>
        ))}
      </div>

      {current && (
        <SeriesForm
          key={current.id}
          series={current}
          clients={clients}
          venues={venues}
          onSaved={(text) => {
            setNotice({ tone: "ok", text });
            load();
          }}
          onImage={load}
        />
      )}
    </div>
  );
}

function SeriesForm({
  series,
  clients,
  venues,
  onSaved,
  onImage,
}: {
  series: Series | null;
  clients: Option[];
  venues: Option[];
  onSaved: (text: string, id?: string) => void;
  onImage?: () => void;
}) {
  const [form, setForm] = useState<Form>(series ? toForm(series) : blank);
  const [images, setImages] = useState({
    title_logo_url: series?.title_logo_url ?? null,
    presents_logo_url: series?.presents_logo_url ?? null,
    cover_url: series?.cover_url ?? null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function saveImage(key: keyof typeof images, url: string | null) {
    if (!series) return false;
    const res = await api(`/api/admin/ladies-night/series/${series.id}`, { method: "PATCH", body: { [key]: url } });
    if (!res.ok) return false;
    setImages((i) => ({ ...i, [key]: url }));
    onImage?.();
    return true;
  }

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      ...form,
      tagline: form.tagline || null,
      schedule_note: form.schedule_note || null,
      posh_url: form.posh_url || null,
      client_id: form.client_id || null,
      default_venue_id: form.default_venue_id || null,
    };
    const res = series
      ? await api<{ error?: string; field?: string; message?: string; series?: { id: string } }>(`/api/admin/ladies-night/series/${series.id}`, { method: "PATCH", body })
      : await api<{ error?: string; field?: string; message?: string; series?: { id: string } }>("/api/admin/ladies-night/series", { method: "POST", body });
    setBusy(false);
    if (!res.ok) return setError({ field: res.data.field, text: errorText(res.data) });
    onSaved(series ? `${form.name} is saved. Changes show on its page right away.` : `${form.name} created. Upload its logos below.`, res.data.series?.id);
  }

  const err = (f: string) => (error?.field === f ? <Notice tone="error">{error.text}</Notice> : null);
  const poshMissing = form.feat_posh && !form.posh_url;

  return (
    <div style={{ ...PANEL, padding: 24, margin: "18px 0", display: "flex", flexDirection: "column", gap: 18, maxWidth: 880 }}>
      <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 24 }}>{series ? `Edit ${series.name}` : "New series"}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Field id="sr-name" label="Name">
          <input id="sr-name" value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="Please! A Ladies Night" style={inputStyle} />
        </Field>
        <Field id="sr-slug" label="Link" hint={form.slug ? `gyaldemsocialclub.com/ladies-night/${form.slug}` : "Lowercase letters, numbers, and dashes."}>
          <input id="sr-slug" value={form.slug} maxLength={60} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="please" style={inputStyle} />
        </Field>
        <Field id="sr-client" label="Presented by" hint="Their logo goes in the footer, and they get the recap after each show.">
          <select id="sr-client" value={form.client_id ?? ""} onChange={(e) => set("client_id", e.target.value || null)} style={selectStyle}>
            <option value="">Gyal Dem (no client)</option>
            {clients.filter((c) => c.active !== false || c.id === form.client_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="sr-venue" label="Usual venue" hint="New shows start here; any show can use another venue.">
          <select id="sr-venue" value={form.default_venue_id ?? ""} onChange={(e) => set("default_venue_id", e.target.value || null)} style={selectStyle}>
            <option value="">No usual venue</option>
            {venues.filter((v) => v.active !== false || v.id === form.default_venue_id).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
      </div>
      {err("name")}{err("slug")}{err("client_id")}{err("default_venue_id")}
      {series && form.slug !== series.slug && (
        <Notice tone="error">Changing the link breaks the old one. Anything already shared with /ladies-night/{series.slug} stops working.</Notice>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Field id="sr-tag" label={`Tagline (${(form.tagline ?? "").length}/160)`} hint="A line on the page and the hub, like “Bingo. Margs. The whole shebang.”">
          <input id="sr-tag" value={form.tagline ?? ""} maxLength={160} onChange={(e) => set("tagline", e.target.value)} style={inputStyle} />
        </Field>
        <Field id="sr-sched" label="Schedule note" hint="Shown on the hub when there's no date yet, like “Thursdays at Mangrove”.">
          <input id="sr-sched" value={form.schedule_note ?? ""} maxLength={80} onChange={(e) => set("schedule_note", e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {(["primary_color", "accent_color"] as const).map((k) => (
          <Field key={k} id={`sr-${k}`} label={k === "primary_color" ? "Main color" : "Accent color"} hint={k === "primary_color" ? "Backgrounds and cards." : "Buttons."}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" aria-label={k} value={form[k] ?? "#6E1420"} onChange={(e) => set(k, e.target.value.toUpperCase())} style={{ width: 44, height: 40, padding: 0, border: "0.5px solid rgba(10,10,10,0.3)", background: "none" }} />
              <input id={`sr-${k}`} value={form[k] ?? ""} maxLength={7} onChange={(e) => set(k, e.target.value)} style={{ ...inputStyle, width: 110 }} />
            </span>
          </Field>
        ))}
      </div>
      {err("primary_color")}{err("accent_color")}
      {form.feat_voting && <span style={{ fontSize: 12, color: MUTED, marginTop: -8 }}>On People&apos;s Choice series, the booked artist&apos;s colors and cover photo are used when they have them.</span>}

      <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: LINE }}>
        <p style={sectionLabel}>What this series uses</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {FEATURES.map((f) => (
            <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={!!form[f.key as keyof Form]} onChange={(e) => set(f.key as keyof Form, e.target.checked as never)} style={{ width: 18, height: 18, marginTop: 2, accentColor: RED, flex: "none" }} />
              <span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</span>
                <span style={{ display: "block", fontSize: 12, color: MUTED }}>{f.help}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {form.feat_posh && (
        <Field id="sr-posh" label="Posh link" hint="Use the client's Posh tracking link named “Gyal Dem”, so Posh credits RSVPs that come from our page.">
          <input id="sr-posh" value={form.posh_url ?? ""} maxLength={500} onChange={(e) => set("posh_url", e.target.value.trim())} placeholder="https://posh.vip/e/..." style={inputStyle} />
        </Field>
      )}
      {poshMissing && <Notice tone="error">Add the Posh link, or the Posh step stays hidden.</Notice>}
      {err("posh_url")}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Field id="sr-delay" label="Bingo call delay (seconds)" hint="How long after Called before guests see a line.">
          <input id="sr-delay" type="number" min={0} max={30} value={form.call_delay_seconds} onChange={(e) => set("call_delay_seconds", Number(e.target.value))} style={{ ...inputStyle, width: 120 }} />
        </Field>
        <Field id="sr-sort" label="Order on the hub" hint="Lower numbers show first.">
          <input id="sr-sort" type="number" min={0} max={1000} value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} style={{ ...inputStyle, width: 120 }} />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-end", paddingBottom: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} style={{ width: 18, height: 18, accentColor: RED }} />
          <span style={{ fontSize: 14 }}>Live on the site</span>
        </label>
      </div>
      {err("call_delay_seconds")}{err("sort_order")}

      <section style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16, borderTop: LINE }}>
        <p style={sectionLabel}>Event logos and photo</p>
        {series ? (
          <>
            <ImageSlot
              label="Title logo"
              url={images.title_logo_url}
              uploadUrl={`/api/admin/ladies-night/series/${series.id}/upload`}
              kind="title"
              hint="The series wordmark, white on transparent (PNG). Used as the page title."
              onSaved={(u) => saveImage("title_logo_url", u)}
            />
            <ImageSlot
              label="“Presents” line (optional)"
              url={images.presents_logo_url}
              uploadUrl={`/api/admin/ladies-night/series/${series.id}/upload`}
              kind="presents"
              hint="Sits above the title, like “Where's Jeanie Presents:”. White on transparent."
              onSaved={(u) => saveImage("presents_logo_url", u)}
            />
            <ImageSlot
              label="Cover photo"
              url={images.cover_url}
              uploadUrl={`/api/admin/ladies-night/series/${series.id}/upload`}
              kind="cover"
              photo
              hint="Full-bleed behind the RSVP form. Portrait works best."
              onSaved={(u) => saveImage("cover_url", u)}
            />
          </>
        ) : (
          <span style={{ fontSize: 12, color: MUTED }}>Create the series first, then upload its logos and photo.</span>
        )}
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", paddingTop: 16, borderTop: LINE }}>
        <button onClick={save} disabled={busy || !form.name.trim() || !form.slug} style={button("primary", !busy && !!form.name.trim() && !!form.slug)}>
          {busy ? "Saving…" : series ? "Save changes" : "Create series"}
        </button>
        {series && (
          <>
            <a href={`/ladies-night/${series.slug}`} target="_blank" rel="noopener" style={button("quiet")}>Open page ↗</a>
            <a href={`/ladies-night/${series.slug}/live`} target="_blank" rel="noopener" style={button("quiet")}>Open live page ↗</a>
            <a href={`/api/admin/ladies-night/series/${series.id}/placard`} target="_blank" rel="noopener" style={button("secondary")}>Print table placard ↗</a>
          </>
        )}
      </div>
      {error && !error.field && <Notice tone="error">{error.text}</Notice>}
      {series && <span style={{ fontSize: 12, color: GREEN }}>The placard&apos;s QR code opens /ladies-night/{series.slug}/live, which always shows tonight&apos;s show. Print once and reuse.</span>}
    </div>
  );
}
