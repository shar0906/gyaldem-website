// admin/FocalPointPicker.tsx
//
// Pick where a photo stays anchored when it's cropped, like the gallery
// covers: click the photo to place the point, and see it in the shapes
// it's shown in before saving. The caller passes those shapes as frames.

"use client";

import { useState } from "react";
import { button } from "./ladies-night/kit";

export type Frame = { w: number; h: number; label: string };

const DEFAULT = "50% 50%";

function parse(pos: string | null | undefined): { x: number; y: number } {
  const m = (pos ?? "").match(/^(\d{1,3})% (\d{1,3})%$/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 50, y: 50 };
}

export default function FocalPointPicker({
  url,
  position,
  frames,
  onSave,
  onCancel,
}: {
  url: string;
  position: string | null;
  frames: Frame[];
  onSave: (position: string) => void;
  onCancel: () => void;
}) {
  const [pos, setPos] = useState(position || DEFAULT);
  const { x, y } = parse(pos);

  function pick(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const py = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    setPos(`${Math.round(px)}% ${Math.round(py)}%`);
  }

  function nudge(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    setPos(`${Math.min(100, Math.max(0, x + m[0]))}% ${Math.min(100, Math.max(0, y + m[1]))}%`);
  }

  const frame = (w: number, h: number, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div style={{ width: w, height: h, borderRadius: 8, overflow: "hidden", background: `url("${url}") ${pos} / cover no-repeat, #111`, boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }} />
      <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{label}</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set the focal point"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "sans-serif" }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div style={{ background: "#1A1415", padding: 24, maxWidth: 980, width: "100%", maxHeight: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <p style={{ color: "white", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, margin: "0 0 4px" }}>Set the focal point</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>
            Click the part of the photo that should always stay in view (a face, say). Arrow keys nudge it. The previews show how it crops.
          </p>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div
            tabIndex={0}
            onClick={pick}
            onKeyDown={nudge}
            aria-label={`Focal point at ${pos}. Click or use arrow keys to move it.`}
            // Hugs the image exactly, so a click maps to the same spot on the photo.
            style={{ position: "relative", cursor: "crosshair", userSelect: "none", flex: "none", alignSelf: "flex-start", display: "inline-block", maxWidth: "min(520px, 100%)", outline: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" draggable={false} style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", maxHeight: 460 }} />
            <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", pointerEvents: "none", width: 28, height: 28, borderRadius: "50%", border: "2px solid white", background: "rgba(139,26,26,0.8)", boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }} />
            <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.75)", fontSize: 10, letterSpacing: "0.1em", padding: "4px 8px" }}>{pos}</span>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
            {frames.map((f) => (
              <div key={f.label}>{frame(f.w, f.h, f.label)}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={() => setPos(DEFAULT)} style={{ ...button("quiet"), color: "rgba(255,255,255,0.6)" }}>Reset</button>
          <button onClick={onCancel} style={{ ...button("quiet"), color: "rgba(255,255,255,0.6)" }}>Cancel</button>
          <button onClick={() => onSave(pos)} style={button("primary")}>Save focal point</button>
        </div>
      </div>
    </div>
  );
}
