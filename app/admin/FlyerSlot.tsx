// admin/FlyerSlot.tsx
//
// The flyer upload, shared by the Events form and the Ladies Night Shows
// editor. A Ladies Night show's flyer is its Events page entry's flyer, so
// replacing it in either place changes both. The file goes to the
// event-flyers bucket; the caller saves the URL with the rest of its form.

"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { button } from "./ladies-night/kit";

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

  // Laid out exactly like the image slots in Ladies Night (label on top,
  // the image, and the buttons and hint beside it), so they line up.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "sans-serif" }}>
      <label htmlFor={id} style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(10,10,10,0.6)" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ width: 96, height: 120, background: url ? `center / cover no-repeat url("${url}"), #2A1416` : "#EFE8DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(10,10,10,0.4)", flex: "none" }}>
          {!url && "None yet"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: "1 1 180px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ ...button("secondary", !busy), cursor: busy ? "default" : "pointer", position: "relative" }}>
              {busy ? "Uploading…" : url ? "Replace" : "Upload"}
              <input
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={busy}
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
              />
            </label>
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener" style={button("quiet")}>View ↗</a>
                <button type="button" onClick={() => onChange(null)} disabled={busy} style={button("quiet", !busy)}>
                  Remove
                </button>
              </>
            )}
          </div>
          {hint && <span style={{ fontSize: 12, color: "rgba(10,10,10,0.55)", lineHeight: 1.45 }}>{hint}</span>}
          {error && <span role="alert" style={{ fontSize: 13, color: "#8B1A1A" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
