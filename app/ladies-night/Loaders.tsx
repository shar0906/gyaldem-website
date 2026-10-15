// ladies-night/Loaders.tsx
//
// The Ladies Night loading moments, in the series' colors (the
// --ln-primary / --ln-accent / --ln-deep variables of the page around
// them):
//   record  the default: a spinning record, "Cueing the record"
//   rose    a series pick: a gold rose drawing itself, "Setting the table"
//   bingo   bingo nights on the live page: B-I-N-G-O balls dropping in,
//           "Getting your card ready" (no event title)
// Plus the bingo balls for the live page's bingo card, and the curtain
// intro Gyal Dem's own series play the first time a guest opens the page.
//
// Loaders only appear after a short delay, so a fast load doesn't flash.
// Everything holds still for guests whose phones are set to reduce motion.

"use client";

import { useEffect, useState } from "react";
import { CREAM, GOLD, SANS, SERIF } from "./shared";

export type LoaderKind = "record" | "rose" | "bingo";

const DELAY_MS = 300;

const CSS = `
@keyframes ln-disc { to { transform: rotate(360deg) } }
@keyframes ln-arm { 0% { transform: rotate(-18deg) } 25%, 85% { transform: rotate(0deg) } 100% { transform: rotate(-18deg) } }
@keyframes ln-rose { 0% { stroke-dashoffset: 1; opacity: 1 } 50% { stroke-dashoffset: 0; opacity: 1 } 82% { stroke-dashoffset: 0; opacity: 1 } 100% { stroke-dashoffset: 0; opacity: 0 } }
@keyframes ln-ball { 0% { transform: scale(0) translateY(-30px); opacity: 0 } 18% { transform: none; opacity: 1 } 72% { transform: none; opacity: 1 } 88%, 100% { transform: scale(.6); opacity: 0 } }
@keyframes ln-hop { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-7px) } }
@keyframes ln-in { from { opacity: 0 } to { opacity: 1 } }
.ln-disc { animation: ln-disc 1.8s linear infinite; transform-origin: 90px 100px }
.ln-arm { animation: ln-arm 3.6s ease-in-out infinite; transform-origin: 150px 18px }
.ln-rose path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ln-rose 3.2s ease-in-out infinite }
.ln-ball { animation: ln-ball 2.6s cubic-bezier(.34,1.56,.64,1) infinite; opacity: 0 }
.ln-hop { animation: ln-hop 1.4s ease-in-out infinite }
.ln-loader { animation: ln-in .4s ease both }
@media (prefers-reduced-motion: reduce) {
  .ln-disc, .ln-arm, .ln-hop, .ln-loader { animation: none }
  .ln-rose path { animation: none; stroke-dashoffset: 0 }
  .ln-ball { animation: none; opacity: 1 }
}`;

export function LoaderStyles() {
  return <style>{CSS}</style>;
}

// True once the delay has passed.
export function useDelayed(ms = DELAY_MS): boolean {
  const [on, setOn] = useState(ms <= 0);
  useEffect(() => {
    if (ms <= 0) return;
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return on;
}

function Record() {
  return (
    <svg width="200" height="190" viewBox="0 0 200 190" aria-hidden="true">
      <g className="ln-disc">
        <circle cx="90" cy="100" r="82" fill="#140407" />
        {[72, 62, 52].map((r) => (
          <circle key={r} cx="90" cy="100" r={r} fill="none" stroke="#2A0E12" strokeWidth="1.2" />
        ))}
        <path d="M30 70 A70 70 0 0 1 60 38" fill="none" stroke="rgba(251,243,236,0.18)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="90" cy="100" r="30" fill="var(--ln-accent, #C81E3A)" />
        <circle cx="90" cy="100" r="30" fill="none" stroke={GOLD} strokeWidth="1.5" />
        <text x="90" y="96" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="11" fill={CREAM}>Ladies</text>
        <text x="90" y="110" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="11" fill={CREAM}>Night</text>
        <circle cx="90" cy="100" r="2.5" fill="#140407" />
      </g>
      <g className="ln-arm">
        <circle cx="150" cy="18" r="9" fill={GOLD} />
        <path d="M150 18 L170 92 L148 132" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="138" y="128" width="16" height="10" rx="2" fill={GOLD} transform="rotate(-30 146 133)" />
      </g>
    </svg>
  );
}

function Rose() {
  const paths = [
    "M60 30 C45 30 38 42 42 54 C46 66 62 68 70 58 C78 48 70 36 60 38 C52 40 50 50 57 54 C62 57 66 52 63 48",
    "M42 54 C30 50 28 70 40 80 C50 88 70 88 80 80 C92 70 90 50 78 54",
    "M60 86 C60 105 58 125 62 150",
    "M61 115 C72 105 84 106 90 110 C82 118 70 120 61 115",
  ];
  return (
    <svg className="ln-rose" width="120" height="160" viewBox="0 0 120 160" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} pathLength={1} d={d} style={{ animationDelay: `${[0, 0.25, 0.55, 0.8][i]}s` }} />
      ))}
    </svg>
  );
}

const LETTERS = ["B", "I", "N", "G", "O"];

// The five balls. "drop" for the full-screen loader, "hop" in the bingo card.
export function BingoBalls({ size = 52, motion = "drop" }: { size?: number; motion?: "drop" | "hop" }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", gap: Math.round(size / 5) }}>
      {LETTERS.map((l, i) => {
        const hot = i === 2;
        return (
          <span
            key={l}
            className={motion === "drop" ? "ln-ball" : "ln-hop"}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: hot ? "var(--ln-accent, #C81E3A)" : CREAM,
              color: hot ? CREAM : "var(--ln-primary, #6E1420)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: Math.round(size * 0.46),
              boxShadow: `inset 0 0 0 ${size > 40 ? 4 : 2.5}px ${GOLD}`,
              animationDelay: `${i * (motion === "drop" ? 0.18 : 0.12)}s`,
            }}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
}

// A row of small dots that hop: "next call coming".
export function HopDots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", gap: 5, alignItems: "center", verticalAlign: "middle" }}>
      {LETTERS.map((l, i) => (
        <span key={l} className="ln-hop" style={{ width: 8, height: 8, borderRadius: "50%", background: i === 2 ? "var(--ln-accent, #C81E3A)" : GOLD, animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

const CAPTION: Record<LoaderKind, string> = {
  record: "Cueing the record",
  rose: "Setting the table",
  bingo: "Getting your card ready",
};

export function LnLoader({
  kind = "record",
  title,
  caption,
  minHeight = "100dvh",
  delay = DELAY_MS,
}: {
  kind?: LoaderKind;
  title?: string | null;
  caption?: string;
  minHeight?: string | number;
  delay?: number;
}) {
  const shown = useDelayed(delay);
  const text = caption ?? CAPTION[kind];
  return (
    <div role="status" aria-label={text} style={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center", color: CREAM }}>
      <LoaderStyles />
      {shown && (
        <div className="ln-loader" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: 24, textAlign: "center" }}>
          {kind === "rose" ? <Rose /> : kind === "bingo" ? <BingoBalls /> : <Record />}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {kind === "bingo" ? (
              <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 24 }}>{text}</p>
            ) : (
              <>
                {title && <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 26 }}>{title}</p>}
                <p style={{ margin: 0, fontFamily: SANS, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(251,243,236,0.7)" }}>{text}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// The curtain intro: velvet curtains part on the Gyal Dem logo and
// "presents", then the show's title, then it fades away into the page.
// Plays once per visit per series (first open), only on Gyal Dem's own
// series; a tap skips it. Waits on the title until the page is ready.
const CURTAIN_KEY = (slug: string) => `ln-curtain:${slug}`;
const TITLE_DONE_MS = 3100;
const FADE_MS = 500;

export function shouldPlayCurtain(slug: string): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (sessionStorage.getItem(CURTAIN_KEY(slug))) return false;
    sessionStorage.setItem(CURTAIN_KEY(slug), "1");
    return true;
  } catch {
    return false;
  }
}

const CURTAIN_CSS = `
@keyframes ln-cur-l { from { transform: translateX(0) } to { transform: translateX(-101%) } }
@keyframes ln-cur-r { from { transform: translateX(0) } to { transform: translateX(101%) } }
@keyframes ln-cur-logo { 0% { opacity: 0; transform: translateY(8px) } 25%, 75% { opacity: 1; transform: none } 100% { opacity: 0; transform: translateY(-10px) } }
@keyframes ln-cur-title { from { opacity: 0; transform: scale(.97) } to { opacity: 1; transform: none } }
.ln-cur-l { animation: ln-cur-l .8s cubic-bezier(.7,0,.2,1) .25s both }
.ln-cur-r { animation: ln-cur-r .8s cubic-bezier(.7,0,.2,1) .25s both }
.ln-cur-logo { animation: ln-cur-logo 1.5s ease-in-out .6s both }
.ln-cur-title { animation: ln-cur-title .45s ease-out 2.15s both }
`;

export function CurtainIntro({ title, ready, onDone }: { title: string; ready: boolean; onDone: () => void }) {
  const [titleDone, setTitleDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTitleDone(true), TITLE_DONE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && (titleDone || skipped)) setLeaving(true);
  }, [ready, titleDone, skipped]);

  // Once it starts fading, it's gone (and out of the way of taps) after the fade.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  const velvet = "repeating-linear-gradient(90deg, var(--ln-primary, #6E1420) 0 18px, rgba(0,0,0,0.18) 18px 30px, var(--ln-primary, #6E1420) 30px 40px)";
  return (
    <div
      onClick={() => setSkipped(true)}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        overflow: "hidden",
        background: "var(--ln-deep, #4A0D15)",
        color: CREAM,
        cursor: "pointer",
        pointerEvents: leaving ? "none" : "auto",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <style>{CURTAIN_CSS}</style>
      <div className="ln-cur-logo" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gyaldem_red_wl_transparent.png" alt="" style={{ width: 200, height: "auto", display: "block" }} />
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD }}>presents</p>
      </div>
      <div className="ln-cur-title" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 38, lineHeight: 1.15 }}>{title}</p>
      </div>
      <div className="ln-cur-l" style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: velvet, boxShadow: "inset -12px 0 24px rgba(0,0,0,0.35)" }} />
      <div className="ln-cur-r" style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: velvet, boxShadow: "inset 12px 0 24px rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: GOLD }} />
    </div>
  );
}
