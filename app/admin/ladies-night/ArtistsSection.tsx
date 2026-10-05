// admin/ladies-night/ArtistsSection.tsx
//
// Every artist: status, pending changes, bookings. Invite new artists,
// edit a profile directly (goes live right away), deactivate.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { BallotPreview, GatePreview, PreviewProfile } from "../../components/ln/PhonePreview";
import { BIO_MAX, COVER_MAX_BYTES, IMAGE_TYPES, PHOTO_MAX_BYTES, colorProblem } from "../../lib/ln/profile-rules";
import { DEFAULT_ACCENT, DEFAULT_PRIMARY } from "../../lib/ln/theme";
import { FAINT, Field, GREEN, H1, LINE, MUTED, Notice, PANEL, RED, api, button, errorText, inputStyle } from "./kit";

type Artist = PreviewProfile & {
  id: string;
  staff_email: string;
  approved_at: string | null;
  active: boolean;
  has_pending_changes: boolean;
  upcoming_shows: number;
};

const INVITE_ERRORS: Record<string, string> = {
  bad_email: "Check the email address.",
  rate_limited: "Too many emails sent this hour. Try again in a little while.",
};

export default function ArtistsSection({ onReviewChanges }: { onReviewChanges: () => void }) {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ artists: Artist[] }>("/api/admin/ladies-night/artists");
    if (!res.ok) {
      setLoadError(errorText(res.data as { error?: string }));
      return;
    }
    setArtists(res.data.artists);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setActive(a: Artist, active: boolean) {
    if (!active && !confirm(`Deactivate ${a.display_name}? They won't be able to log in or be booked. Past shows and results stay.`)) return;
    const res = await api<{ upcoming_shows?: number; error?: string; message?: string }>(`/api/admin/ladies-night/artists/${a.id}`, { method: "PATCH", body: { active } });
    if (!res.ok) {
      setNotice({ tone: "error", text: errorText(res.data) });
      return;
    }
    const booked = res.data.upcoming_shows ?? 0;
    setNotice({
      tone: !active && booked ? "error" : "ok",
      text: active
        ? `${a.display_name} is active again.`
        : booked
          ? `${a.display_name} is deactivated but still booked on ${booked} upcoming show${booked === 1 ? "" : "s"}. Reassign ${booked === 1 ? "it" : "them"} under Shows.`
          : `${a.display_name} is deactivated.`,
    });
    load();
  }

  if (loadError) {
    return (
      <div>
        <H1>Artists</H1>
        <Notice tone="error">{loadError}</Notice>
      </div>
    );
  }
  if (!artists) return <p style={{ color: FAINT, fontSize: 14 }}>Loading…</p>;

  const editing = artists.find((a) => a.id === editingId) ?? null;

  return (
    <div>
      <style>{`
        .ln-artist-row{ display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1.3fr) minmax(0,1fr) 110px auto; gap:16px; align-items:center; padding:14px 20px; border-bottom:${LINE}; }
        @media (max-width: 900px){ .ln-artist-row{ grid-template-columns:1fr; gap:6px; } .ln-artist-head{ display:none !important; } }
      `}</style>
      <H1 action={<button onClick={() => setInviteOpen((v) => !v)} style={button("primary")}>{inviteOpen ? "Close" : "+ Invite artist"}</button>}>Artists</H1>
      {inviteOpen && (
        <InviteForm
          onDone={(text) => {
            setInviteOpen(false);
            setNotice({ tone: "ok", text });
            load();
          }}
        />
      )}
      {notice && <div style={{ marginBottom: 14 }}><Notice tone={notice.tone}>{notice.text}</Notice></div>}

      <div style={PANEL}>
        <div className="ln-artist-row ln-artist-head" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED, padding: "12px 20px" }}>
          <span>Artist</span>
          <span>Login email</span>
          <span>Public profile</span>
          <span>Upcoming</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {artists.length === 0 && <p style={{ padding: 20, margin: 0, fontSize: 14, color: MUTED }}>No artists yet. Invite one to get started.</p>}
        {artists.map((a) => (
          <div key={a.id} className="ln-artist-row" style={{ opacity: a.active ? 1 : 0.55 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: a.photo_url ? `center / cover no-repeat url("${a.photo_url}")` : a.primary_color ?? "#E8E1D6",
                  color: "#D8B667",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {!a.photo_url && a.display_name.charAt(0).toUpperCase()}
              </span>
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 18, overflow: "hidden", textOverflow: "ellipsis" }}>{a.display_name}</span>
            </span>
            <span style={{ fontSize: 13, color: MUTED, overflowWrap: "anywhere" }}>{a.staff_email}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
              {!a.active ? (
                <span style={{ color: MUTED }}>Deactivated</span>
              ) : a.approved_at ? (
                <span style={{ color: GREEN }}>Approved</span>
              ) : (
                <span style={{ color: RED }}>Not public yet</span>
              )}
              {a.has_pending_changes && (
                <button onClick={onReviewChanges} style={{ background: "none", border: "none", padding: 0, color: RED, fontSize: 12, textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>
                  Changes waiting for review
                </button>
              )}
            </span>
            <span style={{ fontSize: 13 }}>{a.upcoming_shows ? `${a.upcoming_shows} booked` : <span style={{ color: FAINT }}>None</span>}</span>
            <span style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setEditingId(editingId === a.id ? null : a.id)} style={button("quiet")}>{editingId === a.id ? "Close" : "Edit profile"}</button>
              <button onClick={() => setActive(a, !a.active)} style={button("quiet")}>{a.active ? "Deactivate" : "Reactivate"}</button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <EditArtist
          key={editing.id}
          artist={editing}
          onSaved={(text) => {
            setNotice({ tone: "ok", text });
            setEditingId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function InviteForm({ onDone }: { onDone: (text: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await api<{ email_sent?: string; error?: string; message?: string }>("/api/admin/staff/invite", {
      method: "POST",
      body: { email, name, role: "artist" },
    });
    setBusy(false);
    if (!res.ok) {
      setError(INVITE_ERRORS[res.data.error ?? ""] ?? errorText(res.data));
      return;
    }
    onDone(
      res.data.email_sent === "reset"
        ? `${email} already had a login, so they got a password-reset email instead. Their artist profile is ready.`
        : `Invite sent to ${email}. Their artist profile is ready for them to fill in.`
    );
  }

  return (
    <div style={{ ...PANEL, padding: 20, marginBottom: 18, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto", gap: 12, alignItems: "end" }}>
      <Field id="i-email" label="Email">
        <input id="i-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="artist@example.com" style={inputStyle} />
      </Field>
      <Field id="i-name" label="Name guests will see">
        <input id="i-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kay" style={inputStyle} />
      </Field>
      <button onClick={send} disabled={busy || !email.trim()} style={button("primary", !busy && !!email.trim())}>{busy ? "Sending…" : "Send invite"}</button>
      {error && <div style={{ gridColumn: "1 / -1" }}><Notice tone="error">{error}</Notice></div>}
    </div>
  );
}

function EditArtist({ artist, onSaved }: { artist: Artist; onSaved: (text: string) => void }) {
  const [form, setForm] = useState<PreviewProfile>({
    display_name: artist.display_name,
    bio: artist.bio ?? "",
    instagram_handle: artist.instagram_handle ?? "",
    primary_color: artist.primary_color ?? DEFAULT_PRIMARY,
    accent_color: artist.accent_color ?? DEFAULT_ACCENT,
    photo_url: artist.photo_url,
    cover_url: artist.cover_url,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storage = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from("artist-photos"),
    []
  );

  const set = (k: keyof PreviewProfile, v: string | null) => setForm((f) => ({ ...f, [k]: v }));
  const colorIssue = colorProblem(form.primary_color ?? "", form.accent_color ?? "");

  async function upload(kind: "photo" | "cover", file: File | undefined) {
    if (!file) return;
    const max = kind === "photo" ? PHOTO_MAX_BYTES : COVER_MAX_BYTES;
    if (!IMAGE_TYPES[file.type]) return setError("Use a JPG, PNG, or WebP image.");
    if (file.size > max) return setError(`That image is over ${max / 1024 / 1024} MB.`);
    setBusy(kind);
    setError(null);
    const res = await api<{ path: string; token: string; public_url: string; message?: string; error?: string }>(
      `/api/admin/ladies-night/artists/${artist.id}/upload`,
      { method: "POST", body: { kind, content_type: file.type, size: file.size } }
    );
    if (!res.ok) {
      setBusy(null);
      return setError(errorText(res.data));
    }
    const { error: upErr } = await storage.uploadToSignedUrl(res.data.path, res.data.token, file, { contentType: file.type });
    setBusy(null);
    if (upErr) return setError("Upload didn't go through. Try again.");
    set(kind === "photo" ? "photo_url" : "cover_url", res.data.public_url);
  }

  async function save() {
    setBusy("save");
    setError(null);
    const res = await api<{ error?: string; message?: string }>(`/api/admin/ladies-night/artists/${artist.id}`, { method: "PATCH", body: form });
    setBusy(null);
    if (!res.ok) return setError(errorText(res.data));
    onSaved(`${form.display_name}'s profile is saved and live.`);
  }

  return (
    <div style={{ ...PANEL, padding: 24, marginTop: 18 }}>
      <h2 style={{ margin: "0 0 4px", fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 24 }}>Edit {artist.display_name}</h2>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: MUTED }}>Your edits go live right away and skip the approval queue.</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <UploadLink label={form.photo_url ? "Replace profile photo" : "Upload profile photo"} busy={busy === "photo"} onFile={(f) => upload("photo", f)} />
            <UploadLink label={form.cover_url ? "Replace cover photo" : "Upload cover photo"} busy={busy === "cover"} onFile={(f) => upload("cover", f)} />
          </div>
          <Field id="ed-name" label="Name">
            <input id="ed-name" value={form.display_name} maxLength={80} onChange={(e) => set("display_name", e.target.value)} style={inputStyle} />
          </Field>
          <Field id="ed-ig" label="Instagram (without @)">
            <input id="ed-ig" value={form.instagram_handle ?? ""} maxLength={30} onChange={(e) => set("instagram_handle", e.target.value.replace(/^@/, ""))} style={inputStyle} />
          </Field>
          <Field id="ed-bio" label={`Bio (${(form.bio ?? "").length}/${BIO_MAX})`}>
            <textarea id="ed-bio" rows={4} maxLength={BIO_MAX} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field id="ed-primary" label="Primary color">
              <input id="ed-primary" type="color" value={(form.primary_color ?? DEFAULT_PRIMARY).toLowerCase()} onChange={(e) => set("primary_color", e.target.value.toUpperCase())} style={{ ...inputStyle, padding: 2, height: 44 }} />
            </Field>
            <Field id="ed-accent" label="Accent color">
              <input id="ed-accent" type="color" value={(form.accent_color ?? DEFAULT_ACCENT).toLowerCase()} onChange={(e) => set("accent_color", e.target.value.toUpperCase())} style={{ ...inputStyle, padding: 2, height: 44 }} />
            </Field>
          </div>
          {colorIssue ? <Notice tone="error">{colorIssue}</Notice> : <span style={{ fontSize: 12, color: GREEN }}>Colors pass the contrast check.</span>}
          {error && <Notice tone="error">{error}</Notice>}
          <div>
            <button onClick={save} disabled={busy !== null || !!colorIssue || !form.display_name.trim()} style={button("primary", busy === null && !colorIssue && !!form.display_name.trim())}>
              {busy === "save" ? "Saving…" : "Save and publish"}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <GatePreview profile={form} />
          <BallotPreview profile={form} />
        </div>
      </div>
    </div>
  );
}

function UploadLink({ label, busy, onFile }: { label: string; busy: boolean; onFile: (f: File | undefined) => void }) {
  return (
    <label style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", padding: "8px 0", color: busy ? FAINT : RED }}>
      {busy ? "Uploading…" : label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
      />
    </label>
  );
}

