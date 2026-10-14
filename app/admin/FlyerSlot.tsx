// admin/FlyerSlot.tsx
//
// The flyer upload, shared by the Events form and the Ladies Night Shows
// editor. A Ladies Night show's flyer is its Events page entry's flyer, so
// replacing it in either place changes both. The file goes to the
// event-flyers bucket; the caller saves the URL with the rest of its form.

"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function FlyerSlot({
  url,
  onChange,
  label = "Flyer",
  hint,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `flyer-${label.replace(/\W+/g, "-").toLowerCase()}`;

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return setError("Use a JPG, PNG, WebP, or GIF image.");
    if (file.size > 15 * 1024 * 1024) return setError("That file is over 15 MB.");
    setBusy(true);
    setError(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error: upErr } = await supabase.storage.from("event-flyers").upload(name, file, { upsert: false, contentType: file.type });
    setBusy(false);
    if (upErr || !data) return setError("Upload didn't go through. Try again.");
    onChange(supabase.storage.from("event-flyers").getPublicUrl(data.path).data.publicUrl);
  }

  const small = { fontSize: 12, fontFamily: "sans-serif" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor={id} style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(10,10,10,0.6)", fontFamily: "sans-serif" }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 96, height: 120, background: url ? `center / cover no-repeat url("${url}")` : "#EFE8DC", border: "0.5px solid rgba(10,10,10,0.15)", display: "flex", alignItems: "center", justifyContent: "center", ...small, color: "rgba(10,10,10,0.4)", flex: "none" }}>
          {!url && "No flyer"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ ...small, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 10, color: "#8B1A1A", border: "1px solid #8B1A1A", padding: "10px 14px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
              {busy ? "Uploading…" : url ? "Replace" : "Upload"}
              <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} style={{ display: "none" }} />
            </label>
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener" style={{ ...small, color: "rgba(10,10,10,0.55)" }}>View ↗</a>
                <button type="button" onClick={() => onChange(null)} style={{ ...small, background: "none", border: 0, color: "rgba(10,10,10,0.55)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                  Remove
                </button>
              </>
            )}
          </span>
          {hint && <span style={{ ...small, color: "rgba(10,10,10,0.55)", maxWidth: 420, lineHeight: 1.45 }}>{hint}</span>}
          {error && <span role="alert" style={{ ...small, color: "#8B1A1A" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
