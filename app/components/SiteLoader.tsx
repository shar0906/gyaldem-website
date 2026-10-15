// components/SiteLoader.tsx
//
// The Gyal Dem loader for the main site: the logo with a red line drawing
// in under it. "cream" on the site's pages, "dark" on dark panels (the
// gallery viewer). Appears after a short delay so a fast load doesn't
// flash; holds still for people who reduce motion.

"use client";

import { useEffect, useState } from "react";

const CSS = `
@keyframes gd-rule { 0% { transform: scaleX(0); transform-origin: left } 45%, 60% { transform: scaleX(1); transform-origin: left } 61% { transform: scaleX(1); transform-origin: right } 100% { transform: scaleX(0); transform-origin: right } }
@keyframes gd-in { from { opacity: 0 } to { opacity: 1 } }
.gd-rule { animation: gd-rule 2.4s cubic-bezier(.6,0,.3,1) infinite; transform: scaleX(0) }
.gd-loader { animation: gd-in .4s ease both }
@media (prefers-reduced-motion: reduce) { .gd-rule { animation: none; transform: none } .gd-loader { animation: none } }`;

export default function SiteLoader({
  tone = "cream",
  minHeight = "100vh",
  delay = 300,
}: {
  tone?: "cream" | "dark";
  minHeight?: string | number;
  delay?: number;
}) {
  const [shown, setShown] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const cream = tone === "cream";
  return (
    <div role="status" aria-label="Loading" style={{ minHeight, background: cream ? "#F5F0E8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      {shown && (
        <div className="gd-loader" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cream ? "/gyaldem_red_bl_transparent.png" : "/gyaldem_red_wl_transparent.png"}
            alt=""
            style={{ width: cream ? 200 : 150, height: "auto", display: "block" }}
          />
          <div className="gd-rule" style={{ width: cream ? 150 : 110, height: 1.5, background: "#8B1A1A" }} />
        </div>
      )}
    </div>
  );
}
