// admin/ladies-night/VenuesSection.tsx
//
// Restaurants that host Ladies Night. Admin-only; venues don't log in.
// Name, address, logo, website, Instagram, and the default OpenTable
// widget (a show can override it). Shows pick their venue from this list.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "../../lib/ln/profile-rules";
import { FAINT, Field, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, api, button, errorText, inputStyle } from "./kit";

type Venue = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  opentable_widget: string | null;
  active: boolean;
  upcoming_shows: number;
};
type Form = { name: string; address: string; website_url: string; instagram_handle: string; opentable_widget: string };

const blank: Form = { name: "", address: "", website_url: "", instagram_handle: "", opentable_widget: "" };

export default function VenuesSection() {
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ venues: Venue[] }>("/api/admin/ladies-night/venues");
    if (!res.ok) return setLoadError(errorText(res.data as unknown as { error?: string }));
    setVenues(res.data.venues);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setActive(v: Venue, active: boolean) {
    if (!active && !confirm(`Hide ${v.name}? It won't be offered for new shows. Existing shows keep it.`)) return;
    const res = await api(`/api/admin/ladies-night/venues/${v.id}`, { method: "PATCH", body: { active } });
    if (!res.ok) return setNotice({ tone: "error", text: errorText(res.data) });
    load();
  }

  if (loadError) return <div><H1>Venues</H1><Notice tone="error">{loadError}</Notice></div>;
  if (!venues) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;

  const current = venues.find((v) => v.id === editing) ?? null;

  return (
    <div>
      <style>{`
        .ln-venue-row{ display:grid; grid-template-columns:120px minmax(0,1.3fr) minmax(0,1fr) 110px auto; gap:16px; align-items:center; padding:14px 20px; border-bottom:${LINE}; }
        @media (max-width: 900px){ .ln-venue-row{ grid-template-columns:1fr; gap:6px; } .ln-venue-head{ display:none !important; } }
      `}</style>
      <H1 action={<button onClick={() => setEditing(editing === "new" ? null : "new")} style={button("primary")}>{editing === "new" ? "Close" : "+ Add venue"}</button>}>Venues</H1>
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      {editing === "new" && (
        <VenueForm
          venue={null}
          onSaved={(text) => {
            setEditing(null);
            setNotice({ tone: "ok", text });
            load();
          }}
        />
      )}

      <div style={PANEL}>
        <div className="ln-venue-row ln-venue-head" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED, padding: "12px 20px" }}>
          <span>Logo</span><span>Venue</span><span>OpenTable</span><span>Upcoming</span><span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {venues.length === 0 && <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>No venues yet.</p>}
        {venues.map((v) => (
          <div key={v.id} className="ln-venue-row" style={{ opacity: v.active ? 1 : 0.55 }}>
            <span style={{ width: 96, height: 44, background: v.logo_url ? `center / contain no-repeat url("${v.logo_url}"), #0A0A0A` : "#EFE8DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: FAINT }}>
              {!v.logo_url && "No logo"}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18 }}>{v.name}</span>
              <span style={{ fontSize: 12, color: MUTED }}>{v.address || <span style={{ color: RED }}>Add the address</span>}</span>
            </span>
            <span style={{ fontSize: 13, color: v.opentable_widget ? GREEN : FAINT }}>{v.opentable_widget ? "Widget saved" : "Not set"}</span>
            <span style={{ fontSize: 13 }}>{v.upcoming_shows ? `${v.upcoming_shows} show${v.upcoming_shows === 1 ? "" : "s"}` : <span style={{ color: FAINT }}>None</span>}</span>
            <span style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setEditing(editing === v.id ? null : v.id)} style={button("quiet")}>{editing === v.id ? "Close" : "Edit"}</button>
              <button onClick={() => setActive(v, !v.active)} style={button("quiet")}>{v.active ? "Hide" : "Restore"}</button>
            </span>
          </div>
        ))}
      </div>

      {current && (
        <VenueForm
          key={current.id}
          venue={current}
          onSaved={(text) => {
            setEditing(null);
            setNotice({ tone: "ok", text });
            load();
          }}
        />
      )}
    </div>
  );
}

function VenueForm({ venue, onSaved }: { venue: Venue | null; onSaved: (text: string) => void }) {
  const [form, setForm] = useState<Form>(
    venue
      ? { name: venue.name, address: venue.address ?? "", website_url: venue.website_url ?? "", instagram_handle: venue.instagram_handle ?? "", opentable_widget: venue.opentable_widget ?? "" }
      : blank
  );
  const [logo, setLogo] = useState<string | null>(venue?.logo_url ?? null);
  const [busy, setBusy] = useState<"save" | "logo" | null>(null);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const storage = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from("ln-brand"),
    []
  );
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadLogo(file: File | undefined) {
    if (!file || !venue) return;
    if (!LOGO_TYPES[file.type]) return setError({ field: "logo", text: "Use a PNG or WebP logo, ideally with a transparent background." });
    if (file.size > LOGO_MAX_BYTES) return setError({ field: "logo", text: "Logos can be up to 2 MB." });
    setBusy("logo");
    setError(null);
    const res = await api<{ path: string; token: string; public_url: string; error?: string; message?: string }>(
      `/api/admin/ladies-night/venues/${venue.id}/upload`,
      { method: "POST", body: { content_type: file.type, size: file.size } }
    );
    if (!res.ok) {
      setBusy(null);
      return setError({ field: "logo", text: errorText(res.data) });
    }
    const { error: upErr } = await storage.uploadToSignedUrl(res.data.path, res.data.token, file, { contentType: file.type });
    if (upErr) {
      setBusy(null);
      return setError({ field: "logo", text: "Upload didn't go through. Try again." });
    }
    const saved = await api(`/api/admin/ladies-night/venues/${venue.id}`, { method: "PATCH", body: { logo_url: res.data.public_url } });
    setBusy(null);
    if (!saved.ok) return setError({ field: "logo", text: errorText(saved.data) });
    setLogo(res.data.public_url);
  }

  async function removeLogo() {
    if (!venue) return;
    const res = await api(`/api/admin/ladies-night/venues/${venue.id}`, { method: "PATCH", body: { logo_url: null } });
    if (!res.ok) return setError({ field: "logo", text: errorText(res.data) });
    setLogo(null);
  }

  async function save() {
    setBusy("save");
    setError(null);
    const body = {
      name: form.name,
      address: form.address || null,
      website_url: form.website_url || null,
      instagram_handle: form.instagram_handle || null,
      opentable_widget: form.opentable_widget || null,
    };
    const res = venue
      ? await api<{ error?: string; field?: string; message?: string }>(`/api/admin/ladies-night/venues/${venue.id}`, { method: "PATCH", body })
      : await api<{ error?: string; field?: string; message?: string }>("/api/admin/ladies-night/venues", { method: "POST", body });
    setBusy(null);
    if (!res.ok) return setError({ field: res.data.field, text: errorText(res.data) });
    onSaved(venue ? `${form.name} is saved. Changes show on the ballot page right away.` : `${form.name} added. Edit it to upload a logo.`);
  }

  const err = (f: string) => (error?.field === f ? <Notice tone="error">{error.text}</Notice> : null);

  return (
    <div style={{ ...PANEL, padding: 24, margin: "18px 0", display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 24 }}>{venue ? `Edit ${venue.name}` : "Add a venue"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Field id="v-name" label="Name">
          <input id="v-name" value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} style={inputStyle} />
        </Field>
        <Field id="v-address" label="Address" hint="Shown to guests and used in calendar invites.">
          <input id="v-address" value={form.address} maxLength={200} onChange={(e) => set("address", e.target.value)} placeholder="Street, Miami, FL" style={inputStyle} />
        </Field>
        <Field id="v-web" label="Website" hint="The venue's logo on the ballot page links here.">
          <input id="v-web" value={form.website_url} maxLength={300} onChange={(e) => set("website_url", e.target.value.trim())} placeholder="https://" style={inputStyle} />
        </Field>
        <Field id="v-ig" label="Instagram (without @)" hint="Used for the logo link when there's no website.">
          <input id="v-ig" value={form.instagram_handle} maxLength={31} onChange={(e) => set("instagram_handle", e.target.value.replace(/^@/, ""))} style={inputStyle} />
        </Field>
      </div>
      {err("name")}{err("address")}{err("website_url")}{err("instagram_handle")}
      <Field id="v-ot" label="OpenTable widget code" hint={venue?.opentable_widget ? <span style={{ color: GREEN }}>Saved. Shows at this venue use it unless they set their own.</span> : "Paste the code OpenTable gives the restaurant. Shows use it unless they set their own."}>
        <textarea id="v-ot" rows={2} value={form.opentable_widget} onChange={(e) => set("opentable_widget", e.target.value)} style={{ ...inputStyle, fontFamily: "Menlo, Consolas, monospace", fontSize: 12, resize: "vertical" }} />
      </Field>
      {err("opentable_widget")}

      <div style={{ paddingTop: 14, borderTop: LINE, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 140, height: 64, background: logo ? `center / contain no-repeat url("${logo}"), #0A0A0A` : "#EFE8DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: FAINT }}>
          {!logo && "No logo"}
        </div>
        {venue ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ ...button("secondary", busy === null), cursor: busy === null ? "pointer" : "default" }}>
              {busy === "logo" ? "Uploading…" : logo ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/png,image/webp" disabled={busy !== null} onChange={(e) => { uploadLogo(e.target.files?.[0]); e.target.value = ""; }} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} />
            </label>
            {logo && <button onClick={removeLogo} style={button("quiet")}>Remove logo</button>}
            <span style={{ fontSize: 12, color: MUTED }}>PNG or WebP, transparent background, up to 2 MB. Shown on the dark ballot page.</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: MUTED }}>Save the venue first, then upload its logo.</span>
        )}
      </div>
      {err("logo")}{err("logo_url")}

      <div>
        <button onClick={save} disabled={busy !== null || !form.name.trim()} style={button("primary", busy === null && !!form.name.trim())}>
          {busy === "save" ? "Saving…" : venue ? "Save changes" : "Add venue"}
        </button>
      </div>
    </div>
  );
}
