// admin/artist/ArtistProfile.tsx
//
// The Profile tab: what guests see on the ballot page. Photos upload
// straight to storage; everything else saves as a submission that Gyal
// Dem reviews. The live previews update as the artist edits.

"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { BallotPreview, GatePreview, PreviewProfile } from "../../components/ln/PhonePreview";
import { BIO_MAX, COVER_MAX_BYTES, IMAGE_TYPES, LOGO_MAX_BYTES, LOGO_TYPES, PHOTO_MAX_BYTES, colorProblem } from "../../lib/ln/profile-rules";
import { DEFAULT_ACCENT, DEFAULT_PRIMARY } from "../../lib/ln/theme";
import { FAINT, GOLD, GREEN, MUTED, SOFT_RED, formatDateTime, heading, input, label, primaryButton, textButton } from "./ui";

type Live = PreviewProfile & { approved_at: string | null };
type Pending = PreviewProfile & { submitted_at: string };
type Review = { reviewed_at: string; review_note: string | null };
type Form = {
  display_name: string;
  bio: string;
  instagram_handle: string;
  primary_color: string;
  accent_color: string;
  photo_url: string | null;
  cover_url: string | null;
  logo_url: string | null;
  website_url: string;
};

type UploadKind = "photo" | "cover" | "logo";

const BUCKET = "artist-photos";

function toForm(p: PreviewProfile): Form {
  return {
    display_name: p.display_name ?? "",
    bio: p.bio ?? "",
    instagram_handle: p.instagram_handle ?? "",
    primary_color: (p.primary_color ?? DEFAULT_PRIMARY).toUpperCase(),
    accent_color: (p.accent_color ?? DEFAULT_ACCENT).toUpperCase(),
    photo_url: p.photo_url,
    cover_url: p.cover_url,
    logo_url: p.logo_url ?? null,
    website_url: p.website_url ?? "",
  };
}

export default function ArtistProfile() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [songs, setSongs] = useState<string[]>([]);

  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; text: string } | null>(null);

  const storage = useMemo(
    () =>
      createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from(BUCKET),
    []
  );

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const [res, eventRes] = await Promise.all([fetch("/api/admin/ladies-night/profile"), fetch("/api/admin/ladies-night/my-event")]);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLive(data.artist);
      setPending(data.pending);
      setReview(data.last_review);
      setForm(toForm(data.pending ?? data.artist));
      if (eventRes.ok) {
        const ev = await eventRes.json();
        setSongs((ev.songs ?? []).map((s: { ln_repertoire?: { title: string } }) => s.ln_repertoire?.title).filter(Boolean));
      }
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p style={{ padding: "32px 20px", color: FAINT }}>Loading…</p>;
  if (loadError || !form || !live) {
    return (
      <div style={{ padding: "32px 20px" }}>
        <p style={{ color: SOFT_RED, margin: "0 0 12px" }}>Couldn&apos;t load your profile.</p>
        <button onClick={load} style={primaryButton()}>Try again</button>
      </div>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setMessage(null);
    if (fieldError?.field === key) setFieldError(null);
  };

  const colorIssue = colorProblem(form.primary_color, form.accent_color);
  const nameMissing = !form.display_name.trim();
  const canSubmit = !colorIssue && !nameMissing && !uploading && !saving;

  async function upload(kind: UploadKind, file: File | undefined) {
    if (!file) return;
    setMessage(null);
    const max = kind === "photo" ? PHOTO_MAX_BYTES : kind === "logo" ? LOGO_MAX_BYTES : COVER_MAX_BYTES;
    if (!(kind === "logo" ? LOGO_TYPES : IMAGE_TYPES)[file.type]) {
      setFieldError({ field: kind, text: kind === "logo" ? "Use a PNG or WebP logo, ideally with a transparent background." : "Use a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > max) {
      setFieldError({ field: kind, text: `That image is over ${max / 1024 / 1024} MB.` });
      return;
    }
    setUploading(kind);
    setFieldError(null);
    try {
      const res = await fetch("/api/admin/ladies-night/profile/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, content_type: file.type, size: file.size }),
      });
      const link = await res.json();
      if (!res.ok) throw new Error(link.message ?? "upload_failed");
      const { error } = await storage.uploadToSignedUrl(link.path, link.token, file, { contentType: file.type });
      if (error) throw error;
      set(kind === "photo" ? "photo_url" : kind === "logo" ? "logo_url" : "cover_url", link.public_url);
    } catch (e) {
      setFieldError({ field: kind, text: e instanceof Error && e.message !== "upload_failed" ? e.message : "Upload didn't go through. Try again." });
    }
    setUploading(null);
  }

  async function submit() {
    if (!canSubmit || !form) return;
    setSaving(true);
    setMessage(null);
    setFieldError(null);
    try {
      const res = await fetch("/api/admin/ladies-night/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, instagram_handle: form.instagram_handle.replace(/^@/, "") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "invalid") setFieldError({ field: data.field, text: data.message });
        else setMessage({ ok: false, text: "Couldn't submit. Try again in a moment." });
      } else {
        setPending(data.pending);
        setReview(null);
        setMessage({ ok: true, text: "Submitted. Gyal Dem will review it, and it goes live once approved." });
      }
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server. Check your connection and try again." });
    }
    setSaving(false);
  }

  const preview: PreviewProfile = {
    display_name: form.display_name,
    bio: form.bio || null,
    instagram_handle: form.instagram_handle.replace(/^@/, "") || null,
    primary_color: form.primary_color,
    accent_color: form.accent_color,
    photo_url: form.photo_url,
    cover_url: form.cover_url,
    logo_url: form.logo_url,
    website_url: form.website_url || null,
  };

  const errorFor = (field: string) =>
    fieldError?.field === field ? <p role="alert" style={{ fontSize: 12, color: SOFT_RED, margin: "6px 0 0" }}>{fieldError.text}</p> : null;

  return (
    <div style={{ padding: "24px 20px 48px" }}>
      <style>{`
        .ln-profile{ display:grid; grid-template-columns:minmax(0,1fr) auto; gap:36px; align-items:start; }
        .ln-previews{ display:flex; gap:18px; flex-wrap:wrap; }
        @media (max-width: 1100px){ .ln-profile{ grid-template-columns:1fr; } }
      `}</style>

      <h1 style={heading}>Your profile</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 18px" }}>This is what guests see on the ballot page when you&apos;re performing.</p>

      <StatusBanner live={live} pending={pending} review={review} />

      <div className="ln-profile">
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 640 }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <span style={label}>Profile photo</span>
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 999,
                  border: `1.5px solid ${GOLD}`,
                  background: form.photo_url ? `center / cover no-repeat url("${form.photo_url}")` : "#2A2224",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 34,
                  color: GOLD,
                }}
              >
                {!form.photo_url && (form.display_name.charAt(0).toUpperCase() || "?")}
              </div>
              <UploadButton id="ln-photo" kind="photo" busy={uploading === "photo"} hasImage={!!form.photo_url} onFile={upload} />
              <p style={{ fontSize: 11, color: FAINT, margin: 0, maxWidth: 160 }}>Square works best. JPG, PNG, or WebP, up to 5 MB.</p>
              {errorFor("photo")}
              {errorFor("photo_url")}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <span style={label}>Cover photo (behind the sign-in form)</span>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 90,
                    height: 160,
                    flexShrink: 0,
                    background: form.cover_url ? `center top / cover no-repeat url("${form.cover_url}")` : "linear-gradient(180deg, #4A3A3D, #2B2224)",
                  }}
                />
                <div>
                  <UploadButton id="ln-cover" kind="cover" busy={uploading === "cover"} hasImage={!!form.cover_url} onFile={upload} />
                  <p style={{ fontSize: 11, lineHeight: 1.5, color: FAINT, margin: 0 }}>
                    Portrait, at least 1080 × 1920, up to 10 MB. The sign-in form covers the bottom half, so keep your face in the top half. The preview shows where.
                  </p>
                  {errorFor("cover")}
                  {errorFor("cover_url")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label htmlFor="ln-name" style={label}>Name guests see</label>
              <input id="ln-name" value={form.display_name} maxLength={80} onChange={(e) => set("display_name", e.target.value)} style={input} />
              {nameMissing && <p style={{ fontSize: 12, color: SOFT_RED, margin: "6px 0 0" }}>Add the name guests will see.</p>}
              {errorFor("display_name")}
            </div>
            <div>
              <label htmlFor="ln-ig" style={label}>Instagram handle</label>
              <div style={{ display: "flex", alignItems: "center", ...input, padding: 0 }}>
                <span style={{ padding: "0 2px 0 12px", color: MUTED }}>@</span>
                <input
                  id="ln-ig"
                  value={form.instagram_handle}
                  maxLength={31}
                  placeholder="yourhandle"
                  onChange={(e) => set("instagram_handle", e.target.value.replace(/^@/, ""))}
                  style={{ ...input, border: "none", background: "transparent", paddingLeft: 2 }}
                />
              </div>
              {errorFor("instagram_handle")}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start" }}>
            <div>
              <label htmlFor="ln-web" style={label}>Website (optional)</label>
              <input id="ln-web" type="url" inputMode="url" placeholder="https://" value={form.website_url} maxLength={300} onChange={(e) => set("website_url", e.target.value.trim())} style={input} />
              <p style={{ fontSize: 11, color: FAINT, margin: "6px 0 0" }}>Your logo on the ballot page links here, or to your Instagram if this is empty.</p>
              {errorFor("website_url")}
            </div>
            <div>
              <span style={label}>Logo (optional)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 96, height: 56, flexShrink: 0, border: "1px dashed rgba(255,255,255,0.2)", background: form.logo_url ? `center / contain no-repeat url("${form.logo_url}")` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: FAINT }}>
                  {!form.logo_url && "No logo"}
                </div>
                <div>
                  <UploadButton id="ln-logo" kind="logo" busy={uploading === "logo"} hasImage={!!form.logo_url} onFile={upload} />
                  {form.logo_url && (
                    <button onClick={() => set("logo_url", null)} style={{ ...textButton, color: FAINT, display: "block" }}>Remove logo</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 11, color: FAINT, margin: "6px 0 0" }}>PNG or WebP with a transparent background, up to 2 MB. Shown in the ballot page footer.</p>
              {errorFor("logo")}
              {errorFor("logo_url")}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label htmlFor="ln-bio" style={label}>Bio</label>
              <span style={{ fontSize: 11, color: form.bio.length > BIO_MAX - 20 ? SOFT_RED : FAINT }}>{form.bio.length} / {BIO_MAX}</span>
            </div>
            <textarea
              id="ln-bio"
              rows={4}
              maxLength={BIO_MAX}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              style={{ ...input, lineHeight: 1.5, resize: "vertical" }}
            />
            {errorFor("bio")}
          </div>

          <div>
            <span style={label}>Ballot colors</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <ColorField id="ln-primary" name="Primary" hint="Background and cards" value={form.primary_color} onChange={(v) => set("primary_color", v)} />
              <ColorField id="ln-accent" name="Accent" hint="Buttons, hearts, picks" value={form.accent_color} onChange={(v) => set("accent_color", v)} />
            </div>
            {colorIssue ? (
              <p role="alert" style={{ fontSize: 12, color: SOFT_RED, margin: "8px 0 0" }}>{colorIssue}</p>
            ) : (
              <p style={{ fontSize: 12, color: GREEN, margin: "8px 0 0" }}>Readable: text on these colors passes the contrast check.</p>
            )}
            {errorFor("colors")}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingTop: 18, borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
            <button onClick={submit} disabled={!canSubmit} style={primaryButton(canSubmit)}>
              {saving ? "Submitting…" : pending ? "Update submission" : "Submit for review"}
            </button>
            <span style={{ fontSize: 12, color: MUTED }}>Gyal Dem reviews changes before they go live.</span>
          </div>
          {message && (
            <p role="status" style={{ fontSize: 13, color: message.ok ? GREEN : SOFT_RED, margin: 0 }}>{message.text}</p>
          )}
        </div>

        <div>
          <span style={label}>Live preview, updates as you edit</span>
          <div className="ln-previews">
            <figure style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <GatePreview profile={preview} />
              <figcaption style={{ fontSize: 11, color: FAINT }}>Sign-in</figcaption>
            </figure>
            <figure style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <BallotPreview profile={preview} songs={songs} />
              <figcaption style={{ fontSize: 11, color: FAINT }}>Ballot</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ live, pending, review }: { live: Live; pending: Pending | null; review: Review | null }) {
  let tag: string;
  let text: string;
  let color: string;
  if (pending) {
    tag = "Pending review";
    color = GOLD;
    text = `Your changes from ${formatDateTime(pending.submitted_at)} are with Gyal Dem. ${
      live.approved_at ? "Guests still see your current profile until they're approved." : "Your profile goes public once it's approved."
    } Edit again anytime; your latest version replaces this one.`;
  } else if (review) {
    tag = "Changes requested";
    color = SOFT_RED;
    text = review.review_note ? `Gyal Dem asked: “${review.review_note}”` : "Gyal Dem asked for a few changes. Update your profile and submit again.";
  } else if (live.approved_at) {
    tag = "Live";
    color = GREEN;
    text = "This is what guests see. Any edits go to Gyal Dem for review first.";
  } else {
    tag = "Not public yet";
    color = MUTED;
    text = "Add your photos, bio, and colors, then submit for review. Guests see your profile once it's approved.";
  }
  return (
    <div role="status" style={{ border: `1px solid ${color}66`, background: `${color}14`, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
      <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color, border: `0.5px solid ${color}`, padding: "3px 8px", flexShrink: 0 }}>{tag}</span>
      <span style={{ color: "rgba(255,255,255,0.85)", flex: 1, minWidth: 220 }}>{text}</span>
    </div>
  );
}

function UploadButton({
  id,
  kind,
  busy,
  hasImage,
  onFile,
}: {
  id: string;
  kind: UploadKind;
  busy: boolean;
  hasImage: boolean;
  onFile: (kind: UploadKind, file: File | undefined) => void;
}) {
  return (
    <>
      <label htmlFor={id} style={{ ...textButton, display: "inline-block", cursor: busy ? "default" : "pointer" }}>
        {busy ? "Uploading…" : `${hasImage ? "Replace" : "Upload"} ${kind}`}
      </label>
      <input
        id={id}
        type="file"
        accept={kind === "logo" ? "image/png,image/webp" : "image/jpeg,image/png,image/webp"}
        disabled={busy}
        onChange={(e) => {
          onFile(kind, e.target.files?.[0]);
          e.target.value = "";
        }}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
      />
    </>
  );
}

function ColorField({ id, name, hint, value, onChange }: { id: string; name: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(255,255,255,0.15)", padding: "10px 12px" }}>
      <input
        id={id}
        type="color"
        value={value.toLowerCase()}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label={`${name} color`}
        style={{ width: 44, height: 44, padding: 0, border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 13 }}>{name}</span>
        <span style={{ fontSize: 11, color: FAINT }}>{hint}</span>
        <input
          value={text}
          aria-label={`${name} color hex code`}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setText(v);
            if (/^#[0-9A-F]{6}$/.test(v)) onChange(v);
          }}
          style={{ ...input, padding: "4px 6px", fontSize: 12, width: 96, fontFamily: "monospace" }}
        />
      </div>
    </div>
  );
}
