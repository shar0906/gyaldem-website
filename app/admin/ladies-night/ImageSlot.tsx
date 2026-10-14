// admin/ladies-night/ImageSlot.tsx
//
// One image on a series or client: preview, Upload/Replace, Remove. The
// file goes straight to storage through a one-time signed link from the
// given upload route, then onSaved stores its public URL on the record.

"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { FAINT, MUTED, Notice, api, button, errorText } from "./kit";
import FocalPointPicker from "./FocalPointPicker";

export default function ImageSlot({
  label,
  url,
  uploadUrl,
  kind,
  photo = false,
  hint,
  onSaved,
  position,
  onPosition,
}: {
  label: string;
  url: string | null;
  uploadUrl: string; // the upload route for this record
  kind?: string; // sent to the upload route (series: title, presents, cover)
  photo?: boolean; // JPG allowed, up to 10 MB; otherwise PNG/WebP up to 2 MB
  hint?: string;
  onSaved: (url: string | null) => Promise<boolean>;
  // Cover photos: the focal point, set like gallery covers.
  position?: string | null;
  onPosition?: (position: string | null) => Promise<boolean>;
}) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storage = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from("ln-brand"),
    []
  );
  const accept = photo ? "image/jpeg,image/png,image/webp" : "image/png,image/webp";

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!accept.split(",").includes(file.type)) return setError(photo ? "Use a JPG, PNG, or WebP photo." : "Use a PNG or WebP with a transparent background.");
    if (file.size > (photo ? 10 : 2) * 1024 * 1024) return setError(`That file is over ${photo ? 10 : 2} MB.`);
    setBusy(true);
    setError(null);
    const res = await api<{ path: string; token: string; public_url: string; error?: string; message?: string }>(uploadUrl, {
      method: "POST",
      body: { kind, content_type: file.type, size: file.size },
    });
    if (!res.ok) {
      setBusy(false);
      return setError(errorText(res.data));
    }
    const { error: upErr } = await storage.uploadToSignedUrl(res.data.path, res.data.token, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      return setError("Upload didn't go through. Try again.");
    }
    const ok = await onSaved(res.data.public_url);
    setBusy(false);
    if (!ok) setError("Uploaded, but it didn't save. Try again.");
  }

  // Same layout as the flyer slot: label on top, then the image with its
  // buttons beside it.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(10,10,10,0.6)" }}>{label}</span>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
      <div
        style={{
          width: photo ? 96 : 150,
          height: photo ? 120 : 64,
          background: url ? `${photo && position ? position : "center"} / ${photo ? "cover" : "contain"} no-repeat url("${url}"), #2A1416` : "#EFE8DC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: FAINT,
          flex: "none",
        }}
      >
        {!url && "None yet"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: "1 1 180px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <label style={{ ...button("secondary", !busy), cursor: busy ? "default" : "pointer", position: "relative" }}>
            {busy ? "Uploading…" : url ? "Replace" : "Upload"}
            <input
              type="file"
              accept={accept}
              disabled={busy}
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
            />
          </label>
          {url && onPosition && (
            <button onClick={() => setPicking(true)} disabled={busy} style={button("quiet", !busy)}>
              Focal point
            </button>
          )}
          {url && (
            <button onClick={() => onSaved(null)} disabled={busy} style={button("quiet", !busy)}>
              Remove
            </button>
          )}
        </div>
        {hint && <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.45 }}>{hint}</span>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </div>
    {picking && url && onPosition && (
      <FocalPointPicker
        url={url}
        position={position ?? null}
        onCancel={() => setPicking(false)}
        onSave={async (p) => {
          const ok = await onPosition(p);
          if (ok) setPicking(false);
          else setError("Couldn't save the focal point. Try again.");
        }}
      />
    )}
    </div>
  );
}
