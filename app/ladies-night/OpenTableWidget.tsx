// ladies-night/OpenTableWidget.tsx
//
// BCH's OpenTable reservation widget. Only the OpenTable link saved in
// admin is used; this builds its own <script> tag from it, so nothing
// pasted into admin ever runs here. If the widget doesn't appear within
// a few seconds, a direct OpenTable link shows instead.

"use client";

import { useEffect, useRef, useState } from "react";
import { GOLD } from "./shared";

function directLink(url: string): string | null {
  try {
    const rid = new URL(url).searchParams.get("rid");
    return rid ? `https://www.opentable.com/restref/client/?rid=${encodeURIComponent(rid)}` : null;
  } catch {
    return null;
  }
}

export default function OpenTableWidget({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    el.appendChild(script);
    const t = setTimeout(() => {
      if (!el.querySelector("iframe")) setFallback(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [url]);

  const link = directLink(url);
  return (
    <div>
      <div ref={box} style={{ minHeight: fallback ? 0 : 120, background: "#ffffff", borderRadius: 10, overflow: "hidden" }} />
      {fallback && link && (
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", color: GOLD, fontSize: 14, padding: "12px 0" }}>
          Open OpenTable to reserve →
        </a>
      )}
    </div>
  );
}
