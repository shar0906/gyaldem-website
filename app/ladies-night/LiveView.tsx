// ladies-night/LiveView.tsx
//
// The live page for a series, from the table QR or a guest's own page
// once the host taps We're live. No sign-in. Refreshes on its own every
// few seconds (and right when a called line is due), and pauses while
// the phone's screen is off.
//   before: starting soon, with a countdown to doors
//   live:   bingo calls, host announcements and winners, tonight's
//           running order with what's on now
//   after:  the recap (winners, updates, gallery) and the next date

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Artist, CREAM, Footer, GOLD, INK, SANS, SERIF, Series, V, Venue, card, cta, eyebrow, outlineButton, prettyDate, prettyTime } from "./shared";

type Call = { order: number; callout: string; answer: string | null; card: string | null };
type Post = { id: string; kind: "announcement" | "winner"; body: string; round_number: number | null; created_at: string };
export type LiveData = {
  series: Series;
  show: {
    id: string;
    title: string;
    event_date: string;
    event_start_time: string;
    theme_name: string | null;
    dj_name: string | null;
    venue: Venue | null;
    artist: Artist | null;
  } | null;
  live: {
    state: "before" | "live" | "after";
    started_at: string | null;
    posts: Post[];
    bingo: {
      deck_kind: "match" | "callout_answer";
      round: { number: number; ended: boolean } | null;
      rounds_per_night: number;
      calls: Call[];
      next_visible_at: string | null;
    } | null;
    running_order: { label: string; time: string | null }[];
    run_now: number | null;
    gallery_url: string | null;
    has_bingo: boolean;
    rounds_per_night: number;
  } | null;
  next: {
    event_date: string;
    event_start_time: string;
    theme_name: string | null;
    rsvp_open: boolean;
    rsvp_opens_at: string | null;
  } | null;
};

const REFRESH_MS = 4000;
const VIEW_KEY = "ln_live_seen";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function useCountdown(targetMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  if (!targetMs) return null;
  const s = Math.max(0, Math.floor((targetMs - now) / 1000));
  return { done: s === 0, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

// "2026-10-29" + "20:00" Eastern -> epoch ms.
export function easternMs(date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return guess - (asUtc - guess);
}

export function Countdown({ targetMs, label }: { targetMs: number; label?: string }) {
  const c = useCountdown(targetMs);
  if (!c) return null;
  const cells: [string, number][] = c.d > 0 ? [["Days", c.d], ["Hours", c.h], ["Min", c.m]] : [["Hours", c.h], ["Min", c.m], ["Sec", c.s]];
  return (
    <div role="timer" aria-label={label} style={{ display: "grid", gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`, gap: 8 }}>
      {cells.map(([k, n]) => (
        <div key={k} style={{ background: CREAM, color: INK, borderRadius: 14, padding: "12px 4px 8px", display: "flex", flexDirection: "column", gap: 2, textAlign: "center" }}>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 26 }}>{String(n).padStart(2, "0")}</span>
          <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B4B4F" }}>{k}</span>
        </div>
      ))}
    </div>
  );
}

export function SeriesMark({ series, size = "md" }: { series: Series; size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? 34 : size === "md" ? 64 : 120;
  return series.title_logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={series.title_logo_url} alt={series.name} style={{ height: h, maxWidth: "100%", objectFit: "contain", display: "block" }} />
  ) : (
    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: size === "sm" ? 20 : size === "md" ? 28 : 40, lineHeight: 1.05 }}>{series.name}</span>
  );
}

function BingoCard({ bingo }: { bingo: NonNullable<NonNullable<LiveData["live"]>["bingo"]> }) {
  const latest = bingo.calls[0] ?? null;
  const round = bingo.round;
  const final = round && round.number === bingo.rounds_per_night;
  const label = round
    ? round.ended
      ? round.number >= bingo.rounds_per_night
        ? "Bingo · That's a wrap"
        : `Bingo · Round ${round.number} of ${bingo.rounds_per_night} is over`
      : `Bingo · Round ${round.number} of ${bingo.rounds_per_night}${final ? " · Final round" : ""} · Any line`
    : `Bingo · ${bingo.rounds_per_night} rounds tonight · Any line`;
  const flashKey = latest ? `${round?.number}-${latest.order}` : "none";

  return (
    <section style={{ ...card, textAlign: "center", padding: "22px 18px 24px" }} aria-label="Bingo">
      <style>{`@keyframes ln-flash { from { transform: scale(.96); opacity: 0 } to { transform: none; opacity: 1 } } .ln-flash { animation: ln-flash .7s ease } @media (prefers-reduced-motion: reduce) { .ln-flash { animation: none } }`}</style>
      <div style={eyebrow}>{label}</div>
      <div key={flashKey} className="ln-flash" aria-live="polite" style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: latest && latest.callout.length > 40 ? 26 : 34, lineHeight: 1.12, margin: "12px 0 8px", minHeight: 76, display: "grid", placeItems: "center", overflowWrap: "anywhere" }}>
        {latest ? latest.callout : round?.ended ? "Hold tight for the next round" : "Waiting for the first call…"}
      </div>
      <div style={{ fontSize: 12.5, color: "rgba(251,243,236,0.65)" }}>
        {latest && bingo.deck_kind === "callout_answer" && !round?.ended ? "The answer shows when the next one is called." : `${bingo.calls.length} called${round ? " this round" : ""}`}
      </div>
    </section>
  );
}

function CalledSoFar({ calls, kind }: { calls: Call[]; kind: "match" | "callout_answer" }) {
  if (!calls.length) return null;
  return (
    <section aria-label="Called so far" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 19, fontWeight: 700 }}>Called so far</h2>
      {kind === "match" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {calls.map((c, i) => (
            <span key={c.order} style={{ fontSize: 13, padding: "6px 10px", borderRadius: 999, background: i === 0 ? "rgba(251,243,236,0.22)" : "rgba(251,243,236,0.1)", border: "1px solid rgba(251,243,236,0.18)" }}>
              {c.callout}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {calls.map((c) => (
            <div key={c.order} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 0", borderTop: "1px solid rgba(251,243,236,0.12)" }}>
              <span style={{ fontSize: 13.5, color: "rgba(251,243,236,0.75)" }}>“{c.callout}”</span>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>{c.answer ?? "…"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Updates({ posts }: { posts: Post[] }) {
  return (
    <section style={{ ...card }} aria-label="Updates">
      <h2 style={{ margin: "0 0 12px", fontFamily: SERIF, fontStyle: "italic", fontSize: 19, fontWeight: 700 }}>Updates</h2>
      {posts.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: "rgba(251,243,236,0.7)" }}>Updates from the host show up here.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map((p) => (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 12, borderLeft: `2px solid ${p.kind === "winner" ? CREAM : GOLD}` }}>
              <small style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(251,243,236,0.6)" }}>
                {timeOf(p.created_at)} · {p.kind === "winner" ? "Winner" : "Host"}
              </small>
              <div style={{ fontSize: 15, lineHeight: 1.45, fontWeight: p.kind === "winner" ? 700 : 400 }}>
                {p.kind === "winner" ? "🎉 " : ""}
                {p.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RunningOrder({ items, now, title }: { items: { label: string; time: string | null }[]; now: number | null; title: string }) {
  if (!items.length) return null;
  return (
    <section style={{ ...card }} aria-label={title}>
      <h2 style={{ margin: "0 0 6px", fontFamily: SERIF, fontStyle: "italic", fontSize: 19, fontWeight: 700 }}>{title}</h2>
      {items.map((it, i) => {
        const on = i === now;
        return (
          <div key={i} aria-current={on ? "true" : undefined} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: i ? "1px solid rgba(251,243,236,0.12)" : "none", fontSize: 14.5, color: on ? CREAM : "rgba(251,243,236,0.62)", fontWeight: on ? 700 : 400 }}>
            <span>
              {on && <span style={{ color: "#5BE38A" }}>● </span>}
              {it.label}
            </span>
            {it.time && <span>{prettyTime(it.time)}</span>}
          </div>
        );
      })}
    </section>
  );
}

export default function LiveView({
  slug,
  embedded = false,
  onData,
}: {
  slug: string;
  embedded?: boolean;
  onData?: (d: LiveData) => void;
}) {
  const [data, setData] = useState<LiveData | null>(null);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/ladies-night/live?series=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as LiveData;
      setData(d);
      setFailed(false);
      onDataRef.current?.(d);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
    }
  }, [slug]);

  // Poll while visible; catch up the moment the screen comes back.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      refresh();
      timer = setInterval(refresh, REFRESH_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const vis = () => (document.visibilityState === "visible" ? start() : stop());
    vis();
    document.addEventListener("visibilitychange", vis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [refresh]);

  // A called line due before the next refresh: refresh right when it lands.
  const due = data?.live?.bingo?.next_visible_at ?? null;
  useEffect(() => {
    if (!due) return;
    const wait = new Date(due).getTime() - Date.now() + 150;
    if (wait <= 0 || wait > REFRESH_MS) return;
    const t = setTimeout(refresh, wait);
    return () => clearTimeout(t);
  }, [due, refresh]);

  // Count one visit per device per show, for the recap.
  const showId = data?.show?.id;
  useEffect(() => {
    if (!showId || data?.live?.state !== "live") return;
    try {
      const seen = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "[]") as string[];
      if (seen.includes(showId)) return;
      localStorage.setItem(VIEW_KEY, JSON.stringify([...seen.slice(-20), showId]));
    } catch {
      /* private mode: count anyway */
    }
    fetch("/api/ladies-night/live/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ show_id: showId }) }).catch(() => {});
  }, [showId, data?.live?.state]);

  if (!data) {
    return (
      <div style={{ minHeight: embedded ? 200 : "100dvh", display: "grid", placeItems: "center", color: "rgba(251,243,236,0.6)", fontFamily: SANS }}>
        {failed ? "Reconnecting…" : "Loading…"}
      </div>
    );
  }

  const { series, show, live, next } = data;
  const state = live?.state ?? "before";
  const startMs = show ? easternMs(show.event_date, show.event_start_time) : null;
  const nextMs = next ? easternMs(next.event_date, next.event_start_time) : null;
  const bingo = live?.bingo ?? null;
  const todayEastern = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const isTonight = !!show && show.event_date === todayEastern;
  const showBingo = bingo && (state === "live" || (state === "after" && bingo.calls.length > 0));

  return (
    <main style={{ minHeight: embedded ? undefined : "100dvh", width: "100%", maxWidth: 440, margin: "0 auto", boxSizing: "border-box", padding: `${embedded ? 4 : 16}px 16px calc(26px + env(safe-area-inset-bottom))`, display: "flex", flexDirection: "column", gap: 16, color: CREAM, fontFamily: SANS }}>
      <style>{`@keyframes ln-pulse { 0% { box-shadow: 0 0 0 0 rgba(91,227,138,.5) } 70% { box-shadow: 0 0 0 9px rgba(91,227,138,0) } 100% { box-shadow: 0 0 0 0 rgba(91,227,138,0) } } @media (prefers-reduced-motion: reduce) { .ln-dot { animation: none !important } }`}</style>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44 }}>
        <SeriesMark series={series} size="sm" />
        {state === "live" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            <span className="ln-dot" style={{ width: 8, height: 8, borderRadius: 999, background: "#5BE38A", animation: "ln-pulse 1.8s infinite" }} />
            Live{failed ? " · reconnecting" : ""}
          </span>
        ) : (
          <span style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(251,243,236,0.7)" }}>
            {state === "after" ? "Recap" : isTonight ? "Tonight" : "Next up"}
          </span>
        )}
      </header>

      {!show && (
        <section style={{ ...card, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15 }}>The first night is coming soon.</p>
        </section>
      )}

      {show && state === "before" && (
        <section style={{ ...card, display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
          <div style={eyebrow}>{[prettyDate(show.event_date), show.venue?.name].filter(Boolean).join(" · ")}</div>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 30, lineHeight: 1.08 }}>
            {startMs && startMs <= Date.now() ? "Starting soon" : "Doors open soon"}
          </h1>
          {startMs && startMs > Date.now() && <Countdown targetMs={startMs} label={`Starts ${prettyTime(show.event_start_time.slice(0, 5))}`} />}
          {show.theme_name && <div style={{ fontSize: 13, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>✦ {show.theme_name}</div>}
          {(live?.has_bingo || show.dj_name) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14.5 }}>
              {live?.has_bingo && (
                <span>
                  <strong style={{ fontWeight: 600 }}>{show.theme_name ? `${show.theme_name} bingo` : "Bingo"}</strong> · {live.rounds_per_night} rounds, any line
                </span>
              )}
              {show.dj_name && (
                <span>
                  Music by <strong style={{ fontWeight: 600 }}>{show.dj_name}</strong>
                </span>
              )}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 13.5, color: "rgba(251,243,236,0.75)" }}>
            {live?.has_bingo
              ? "Keep this page open. Bingo calls, updates, and winners show up here once the night starts."
              : "Keep this page open. Updates from the host show up here once the night starts."}
          </p>
        </section>
      )}

      {show && state === "after" && (
        <section style={{ ...card, display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
          <div style={eyebrow}>{[prettyDate(show.event_date), show.theme_name].filter(Boolean).join(" · ")}</div>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 30, lineHeight: 1.08 }}>That&apos;s a wrap.</h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(251,243,236,0.8)" }}>Thank you for coming out. Here&apos;s how the night went.</p>
          {live?.gallery_url && (
            <a href={live.gallery_url} target="_blank" rel="noopener noreferrer" style={{ ...cta(), marginTop: 4 }}>
              See the photos →
            </a>
          )}
        </section>
      )}

      {show && showBingo && bingo && (
        <>
          {state === "live" && <BingoCard bingo={bingo} />}
          <CalledSoFar calls={state === "live" ? bingo.calls.slice(1) : bingo.calls} kind={bingo.deck_kind} />
        </>
      )}

      {show && (state === "live" || (live?.posts.length ?? 0) > 0) && <Updates posts={live?.posts ?? []} />}
      {show && state !== "after" && <RunningOrder items={live?.running_order ?? []} now={state === "live" ? live?.run_now ?? null : null} title={isTonight || state === "live" ? "Tonight" : "The night"} />}

      {next && state === "after" && (
        <section style={{ ...card, display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
          <div style={eyebrow}>Next {series.name}</div>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 24 }}>
            {prettyDate(next.event_date)}
            {next.theme_name ? <span style={{ display: "block", color: V.accentSoft, fontSize: 18 }}>{next.theme_name}</span> : null}
          </h2>
          {nextMs && <Countdown targetMs={nextMs} label="Until the next one" />}
          {!embedded && (
            <a href={`/ladies-night/${series.slug}`} style={{ ...outlineButton, marginTop: 4 }}>
              {next.rsvp_open ? "RSVP for the next one →" : "See what's next →"}
            </a>
          )}
        </section>
      )}

      {!embedded && <Footer venue={show?.venue ?? null} artist={show?.artist ?? null} client={series.client} />}
    </main>
  );
}
