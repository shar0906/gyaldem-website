// admin/showtime/HostConsole.tsx
//
// The host console on show night, one phone for the whole night:
//   Live   We're live (guests' pages switch to the live view), post
//          announcements, set the running order and what's on now, and
//          wrap the night.
//   Bingo  Draw next shows a line to this phone only. Called sends it to
//          guests, who see it a few seconds later (Undo works until then).
//          Three rounds, any line. Someone has BINGO ends the round and
//          posts the winner to the live page.
//   Guests tonight's list, with a download.
// One phone holds the bingo mic at a time; any other host phone follows
// along and can take over.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveData } from "./useLiveData";
import DoorCheckIn from "./DoorCheckIn";
import {
  CREAM,
  Centered,
  GOLD,
  GREEN,
  LINE,
  MUTED,
  RED,
  Reconnecting,
  SOFT_RED,
  ShowPicker,
  Tabs,
  TopBar,
  bigButton,
  fieldInput,
  label,
  panel,
  saveShow,
  savedShow,
  screen,
} from "./ui";

type Draw = {
  order: number;
  line: string;
  song: string | null;
  artist: string | null;
  answer: string | null;
  card: string;
  drawn_at: string;
  called_at: string | null;
  visible_at: string | null;
};
type Post = { id: string; kind: "announcement" | "winner"; body: string; round_number: number | null; created_at: string };
type RunItem = { label: string; time: string | null };
type HostData = {
  show: {
    id: string;
    title: string;
    event_date: string;
    event_start_time: string;
    theme_name: string | null;
    dj_name: string | null;
    series_name: string;
    series_slug: string;
    live_path: string;
    live_enabled: boolean;
    has_bingo: boolean;
    bingo_ready: boolean;
    door_enabled: boolean;
    // false when an admin opens an upcoming show to prep it
    show_day?: boolean;
  } | null;
  shows?: { id: string; label: string }[];
  live?: { state: "before" | "live" | "after"; started_at: string | null; ended_at: string | null; posts: Post[]; running_order: RunItem[]; run_now: number | null; run_is_default: boolean; series_running_order: RunItem[] };
  bingo?: {
    deck: { id: string; name: string; kind: "match" | "callout_answer"; card_face: "answer" | "artist"; size: number } | null;
    rounds_per_night: number;
    delay_seconds: number;
    round: { id: string; number: number; ended: boolean; caller: { email: string | null; since: string | null; is_you: boolean } | null } | null;
    draws: Draw[];
    last_order: number;
    deck_size: number;
  } | null;
  exhausted?: boolean;
};
type GuestRow = { rsvp_id: string; first_name: string; last_name: string; email: string; party_size?: number | null; vip_passes: number; checked_in_at: string | null };

const DEVICE_KEY = "ln_host_device";
const CONFETTI_COLORS = [GOLD, "#C81E3A", CREAM, "#E85D6F", RED];

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const ERRORS: Record<string, string> = {
  stale: "Another draw just happened. Showing it now.",
  not_caller: "Another phone is calling now. Tap Take over to call from this one.",
  round_ended: "This round already ended.",
  round_open: "This round is still going.",
  no_round: "There's no round going right now.",
  no_show_tonight: "There's no show tonight.",
  call_pending: "Tap Called for the line on screen before drawing the next one.",
  already_live: "Guests have already seen that line, so it can't be undone.",
  rounds_done: "That was the last round tonight.",
  no_deck: "This show has no bingo deck. Pick one in admin under Shows.",
  not_live: "Go live first.",
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export default function HostConsole({ onLogout }: { onLogout?: () => void }) {
  const [device, setDevice] = useState<string | null>(null);
  const [showId, setShowId] = useState<string | null>(null);
  useEffect(() => {
    setDevice(deviceId());
    setShowId(savedShow());
  }, []);

  const { data, setData, online, authError, refresh } = useLiveData<HostData>(
    `/api/admin/ladies-night/bingo?device=${device ?? ""}${showId ? `&show=${showId}` : ""}`
  );
  const [tab, setTab] = useState<"live" | "bingo" | "guests">("live");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  const show = data?.show ?? null;
  const currentShowId = show?.id ?? null;

  // Start on Bingo once the night is live and there's a deck.
  const startedOnBingo = useRef(false);
  useEffect(() => {
    if (!startedOnBingo.current && data?.live?.state === "live" && data.bingo?.deck) {
      startedOnBingo.current = true;
      setTab("bingo");
    }
  }, [data?.live?.state, data?.bingo?.deck]);

  // Confetti whenever this phone sees a round flip to ended.
  const lastEnded = useRef<string | null>(null);
  const round = data?.bingo?.round ?? null;
  useEffect(() => {
    if (round?.ended && lastEnded.current !== round.id) {
      if (lastEnded.current !== null || busy === "bingo") setCelebrate((n) => n + 1);
      lastEnded.current = round.id;
    } else if (round && !round.ended && lastEnded.current === null) {
      lastEnded.current = "";
    }
  }, [round, busy]);

  function pick(id: string) {
    saveShow(id);
    setShowId(id);
    setMessage(null);
  }

  async function bingoAct(action: "draw" | "call" | "undo" | "bingo" | "new_round" | "take_over", extra: Record<string, unknown> = {}) {
    if (!device || !data?.bingo) return;
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ladies-night/bingo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_id: currentShowId, action, device, last_seen: data.bingo.last_order ?? 0, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: ERRORS[body.error] ?? "That didn't go through. Check the connection and try again." });
        await refresh();
      } else {
        setData(body);
        if (action === "draw") setExhausted(!!body.exhausted);
        if (action === "new_round" || action === "undo") setExhausted(false);
      }
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server. Check the connection and try again." });
    }
    setBusy(null);
  }

  async function liveAct(action: string, extra: Record<string, unknown> = {}, okText?: string) {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ladies-night/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_id: currentShowId, action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setMessage({ ok: false, text: body.message ?? ERRORS[body.error] ?? "That didn't go through. Try again." });
      else if (okText) setMessage({ ok: true, text: okText });
      await refresh();
      setBusy(null);
      return res.ok;
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server. Check the connection and try again." });
      setBusy(null);
      return false;
    }
  }

  if (authError) {
    return (
      <div style={screen}>
        <TopBar label="Host" onLogout={onLogout} />
        <Centered>
          <p style={{ margin: 0 }}>Your login expired.</p>
          <button onClick={() => location.reload()} style={{ ...bigButton(true), maxWidth: 260 }}>Sign in again</button>
        </Centered>
      </div>
    );
  }
  if (!data || !device) {
    return (
      <div style={screen}>
        <TopBar label="Host" onLogout={onLogout} />
        <Reconnecting online={online} />
        <Centered><span style={{ color: MUTED }}>Loading…</span></Centered>
      </div>
    );
  }
  if (!show) {
    return (
      <div style={screen}>
        <TopBar label="Host" onLogout={onLogout} />
        <Centered>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24 }}>No show tonight</span>
          <span style={{ color: MUTED, fontSize: 14 }}>The host console opens on the night of the show.</span>
        </Centered>
      </div>
    );
  }

  const showDay = show.show_day !== false;
  // On show day, series with door check-in get the door (check in, walk-ins,
  // the door QR) in place of the plain guest list.
  const doorTab = showDay && show.door_enabled;
  const tabs: { id: "live" | "bingo" | "guests"; label: string }[] = [
    { id: "live", label: "Live" },
    ...(data.bingo?.deck ? [{ id: "bingo" as const, label: "Bingo" }] : []),
    { id: "guests", label: doorTab ? "Door" : "Guests" },
  ];
  const dateText = new Date(`${show.event_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div style={{ ...screen, height: "100dvh", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes ln-fall { 0% { transform: translateY(-40px) rotate(0deg); opacity: 1; } 100% { transform: translateY(105dvh) rotate(720deg); opacity: .9; } }
        @media (prefers-reduced-motion: reduce) { .ln-confetti { display: none; } }
      `}</style>
      <TopBar label={`${dateText} · ${show.series_name}`} onLogout={onLogout} />
      <Reconnecting online={online} />
      <ShowPicker shows={data.shows ?? []} value={currentShowId} onChange={pick} />

      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <LiveBadge state={data.live?.state ?? "before"} />
      </div>
      {!showDay && (
        <p role="status" style={{ margin: "10px 16px 0", padding: "10px 12px", borderRadius: 10, background: "rgba(216,182,103,0.12)", color: "#D8B667", fontSize: 13, lineHeight: 1.45 }}>
          Prep mode for {dateText}. Edit the run of show, post updates, and look over the deck. Going live, bingo, and the door open on show day.
        </p>
      )}
      {message && <p role="status" style={{ margin: "10px 16px 0", fontSize: 13, color: message.ok ? GREEN : SOFT_RED }}>{message.text}</p>}

      {tab === "live" && data.live && (
        <LiveTab show={show} live={data.live} busy={busy} online={online} act={liveAct} />
      )}
      {tab === "bingo" && data.bingo?.deck && showDay && (
        <BingoTab bingo={data.bingo} busy={busy} online={online} exhausted={exhausted} act={bingoAct} />
      )}
      {tab === "bingo" && data.bingo?.deck && !showDay && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label}>Tonight&apos;s deck</span>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22, color: CREAM }}>{data.bingo.deck.name}</span>
            <span style={{ fontSize: 13, color: MUTED }}>3 rounds, any line. Drawing and calling open on show day.</span>
          </div>
        </div>
      )}
      {tab === "guests" && (doorTab ? <DoorCheckIn embedded showId={currentShowId} /> : <GuestsTab showId={currentShowId} />)}

      {celebrate > 0 && <Confetti key={celebrate} />}
    </div>
  );
}

function LiveBadge({ state }: { state: "before" | "live" | "after" }) {
  const text = state === "live" ? "Live" : state === "after" ? "Wrapped" : "Not live yet";
  const color = state === "live" ? GREEN : MUTED;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: state === "live" ? GREEN : "rgba(251,243,236,0.3)" }} />
      {text}
    </span>
  );
}

// ---------------- Live ----------------

const QUICK_ADD = ["Doors", "Dinner", "Bingo, round 1", "Bingo, round 2", "Bingo, round 3", "DJ set", "Last call"];

function LiveTab({
  show,
  live,
  busy,
  online,
  act,
}: {
  show: NonNullable<HostData["show"]>;
  live: NonNullable<HostData["live"]>;
  busy: string | null;
  online: boolean;
  act: (action: string, extra?: Record<string, unknown>, okText?: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [order, setOrder] = useState<RunItem[] | null>(null);
  const items = order ?? live.running_order;
  const dirty = order !== null;

  async function post() {
    if (await act("announce", { body: text.trim() }, "Posted to the live page.")) setText("");
  }
  async function saveOrder() {
    const clean = items.filter((i) => i.label.trim());
    if (await act("running_order", { items: clean }, "Run of show saved.")) setOrder(null);
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px calc(24px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 16 }}>
      {live.state === "before" && (
        <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={label}>When the night starts</span>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: CREAM }}>
            Tap We&apos;re live and every guest&apos;s page switches to the live view: bingo calls, your updates, and winners.
          </span>
          {!show.bingo_ready && (
            <span role="alert" style={{ fontSize: 13, lineHeight: 1.5, color: SOFT_RED }}>
              Tonight is set for bingo but there&apos;s no deck yet. Ask an admin to pick one in Shows, then refresh.
            </span>
          )}
          {show.show_day === false && (
            <span style={{ fontSize: 13, lineHeight: 1.5, color: MUTED }}>You can go live on show day.</span>
          )}
          <button onClick={() => act("go_live", {}, "You're live.")} disabled={!!busy || !online || !show.bingo_ready || show.show_day === false} style={bigButton(!busy && online && show.bingo_ready && show.show_day !== false, "gold")}>
            {busy === "go_live" ? "Going live…" : "We're live"}
          </button>
        </div>
      )}
      {live.state === "after" && (
        <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 14, color: CREAM }}>The night is wrapped. The live page shows the recap.</span>
          <button onClick={() => act("reopen")} disabled={!!busy || !online} style={bigButton(!busy && online, "ghost")}>Reopen</button>
        </div>
      )}

      <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="ln-announce" style={label}>Post an update</label>
        <textarea
          id="ln-announce"
          value={text}
          maxLength={280}
          rows={3}
          onChange={(e) => setText(e.target.value)}
          placeholder="Round 2 starts in 5. Grab a fresh card from the bar."
          style={{ ...fieldInput, height: "auto", padding: "10px 12px", lineHeight: 1.4, resize: "vertical" }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 12, color: MUTED }}>{text.length}/280</span>
          <button onClick={post} disabled={!text.trim() || !!busy || !online} style={{ ...bigButton(!!text.trim() && !busy && online), width: "auto", minHeight: 44, padding: "0 18px", fontSize: 13 }}>
            {busy === "announce" ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ ...label, marginBottom: 6 }}>On the live page</span>
        {live.posts.length === 0 && <span style={{ fontSize: 13, color: MUTED }}>Nothing posted yet.</span>}
        {live.posts.map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: LINE }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: MUTED }}>{timeOf(p.created_at)} · {p.kind === "winner" ? "Winner" : "Update"}</div>
              <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{p.body}</div>
            </div>
            <button
              onClick={() => confirm("Take this post down?") && act("delete_post", { post_id: p.id })}
              disabled={!!busy}
              style={{ background: "none", border: 0, color: SOFT_RED, fontSize: 12, cursor: "pointer", minHeight: 36 }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label}>Run of show · tap what&apos;s on now</span>
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>
          Guests see this on the live page. Give each part of the night a name and a start time, then tap the circle when it&apos;s on.
          {live.run_is_default && items.length > 0 && !dirty && " This is the series' usual run of show; edit it for tonight if anything's different."}
        </span>
        {items.length === 0 && !dirty && (
          <span style={{ fontSize: 13, color: CREAM, padding: "6px 0" }}>Nothing yet. Add the parts of tonight below.</span>
        )}
        {items.map((it, i) => {
          const on = !dirty && live.run_now === i;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) 116px 28px", gap: 6, alignItems: "center" }}>
              <button
                aria-label={on ? `${it.label} is on now` : `Mark ${it.label || "this"} as on now`}
                aria-pressed={on}
                disabled={dirty || !!busy}
                onClick={() => act("now", { index: on ? null : i })}
                style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${on ? GREEN : "rgba(251,243,236,0.3)"}`, background: on ? GREEN : "transparent", cursor: dirty ? "default" : "pointer" }}
              />
              <input
                aria-label="Item"
                value={it.label}
                maxLength={80}
                placeholder="e.g. Bingo, round 1"
                onChange={(e) => setOrder(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                style={{ ...fieldInput, height: 40, fontSize: 14 }}
              />
              <input
                aria-label="Time"
                type="time"
                value={it.time ?? ""}
                onChange={(e) => setOrder(items.map((x, j) => (j === i ? { ...x, time: e.target.value || null } : x)))}
                style={{ ...fieldInput, height: 40, fontSize: 14, padding: "0 6px" }}
              />
              <button aria-label="Remove item" onClick={() => setOrder(items.filter((_, j) => j !== i))} style={{ background: "none", border: 0, color: MUTED, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
          );
        })}
        {items.length < 20 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }} aria-label="Quick add">
            {QUICK_ADD.filter((q) => !items.some((x) => x.label === q)).map((q) => (
              <button
                key={q}
                onClick={() => setOrder([...items, { label: q, time: null }])}
                style={{ background: "transparent", border: "1px solid rgba(251,243,236,0.25)", borderRadius: 999, color: CREAM, fontSize: 12.5, padding: "6px 12px", minHeight: 34, cursor: "pointer" }}
              >
                + {q}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {items.length < 20 && (
            <button onClick={() => setOrder([...items, { label: "", time: null }])} style={{ ...bigButton(true, "ghost"), width: "auto", padding: "0 14px", minHeight: 40 }}>
              + Add your own
            </button>
          )}
          {live.series_running_order.length > 0 && (live.run_is_default ? dirty : true) && (
            <button
              onClick={() => (items.length === 0 || confirm("Replace tonight's run of show with the series' usual one?")) && setOrder(live.series_running_order)}
              style={{ background: "none", border: 0, color: MUTED, fontSize: 12, textDecoration: "underline", cursor: "pointer", minHeight: 40 }}
            >
              Use series default
            </button>
          )}
          {dirty && (
            <>
              <button onClick={saveOrder} disabled={!!busy || !online} style={{ ...bigButton(!busy && online), width: "auto", padding: "0 16px", minHeight: 40, fontSize: 12 }}>
                {busy === "running_order" ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setOrder(null)} style={{ background: "none", border: 0, color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      <a href={show.live_path} target="_blank" rel="noopener" style={{ ...bigButton(true, "ghost"), display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
        Open the live page ↗
      </a>
      {live.state === "live" && (
        <button onClick={() => confirm("Wrap the night? The live page switches to the recap.") && act("wrap")} disabled={!!busy || !online} style={{ background: "none", border: 0, color: MUTED, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", minHeight: 44 }}>
          Wrap the night
        </button>
      )}
    </div>
  );
}

// ---------------- Bingo ----------------

function BingoTab({
  bingo,
  busy,
  online,
  exhausted,
  act,
}: {
  bingo: NonNullable<HostData["bingo"]>;
  busy: string | null;
  online: boolean;
  exhausted: boolean;
  act: (action: "draw" | "call" | "undo" | "bingo" | "new_round" | "take_over", extra?: Record<string, unknown>) => void;
}) {
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [winner, setWinner] = useState("");
  const round = bingo.round;
  const draws = bingo.draws;
  const current = round && !round.ended ? draws[draws.length - 1] ?? null : null;
  const pendingVisible = current?.visible_at ? new Date(current.visible_at).getTime() : null;
  const now = useNow(!!pendingVisible);
  const status: "none" | "drawn" | "pending" | "live" = !current
    ? "none"
    : !current.called_at
      ? "drawn"
      : pendingVisible && pendingVisible > now
        ? "pending"
        : "live";
  const roundNumber = round?.number ?? 1;
  const ended = !!round?.ended;
  const lastRound = roundNumber >= bingo.rounds_per_night;
  const someoneElse = !!round && !round.ended && !!round.caller && !round.caller.is_you;
  const deckEmpty = bingo.deck_size === 0;
  const canDraw = online && !busy && !ended && !someoneElse && !exhausted && !deckEmpty && status !== "drawn";
  const canCall = online && !busy && !someoneElse && status === "drawn";
  const canUndo = online && !busy && !someoneElse && (status === "drawn" || status === "pending");

  // "Called so far": what's on the cards, A–Z, for checking a winner.
  const called = useMemo(
    () => [...new Set(draws.filter((d) => d.called_at).map((d) => d.card))].sort((a, b) => a.localeCompare(b)),
    [draws]
  );

  return (
    <>
      {someoneElse && (
        <div style={{ margin: "12px 16px 0", padding: "10px 12px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(216,182,103,0.1)" }}>
          <span style={{ fontSize: 13, color: GOLD }}>{round?.caller?.email ?? "Another phone"} is calling. You&apos;re following along.</span>
          <button
            onClick={() => confirm("Take over calling from the other phone?") && act("take_over")}
            disabled={!!busy || !online}
            style={{ flex: "none", minHeight: 40, padding: "0 12px", borderRadius: 10, background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Take over
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 6 }} aria-label={`Round ${roundNumber} of ${bingo.rounds_per_night}`}>
          {Array.from({ length: bingo.rounds_per_night }, (_, i) => i + 1).map((n) => {
            const on = n === roundNumber && !ended;
            const done = n < roundNumber || (n === roundNumber && ended);
            return (
              <span key={n} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", border: `1px solid ${on ? CREAM : "rgba(251,243,236,0.18)"}`, background: on ? CREAM : "transparent", color: on ? "#0A0A0A" : MUTED, fontWeight: on ? 700 : 400, textDecoration: done ? "line-through" : "none" }}>
                Round {n}
              </span>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>{bingo.deck?.name} · any line · {draws.length} of {bingo.deck_size} drawn this round</span>

        {deckEmpty ? (
          <div style={{ ...panel, padding: "26px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22 }}>The deck is empty</span>
            <span style={{ fontSize: 13, color: MUTED }}>Add lines in admin under Ladies Night, Bingo decks.</span>
          </div>
        ) : ended ? (
          <div style={{ ...panel, border: `1px solid ${GOLD}`, padding: "26px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 26, color: GOLD }}>We have a winner</span>
            <span style={{ fontSize: 13, color: MUTED }}>
              {lastRound ? "That was the last round. Bingo's done for tonight." : `Round ${roundNumber} is over. Start round ${roundNumber + 1} when you're ready.`}
            </span>
          </div>
        ) : current ? (
          <div aria-live="polite" style={{ ...panel, padding: "18px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={label}>{status === "drawn" ? "Read this one out" : `Line #${current.order}`}</span>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: current.line.length > 60 ? 22 : 28, lineHeight: 1.2, overflowWrap: "anywhere" }}>
              “{current.line}”
            </span>
            {bingo.deck?.kind === "callout_answer" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 10, borderTop: LINE }}>
                <span style={label}>On the card</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{current.card}</span>
                {current.answer && current.answer !== current.card && <span style={{ fontSize: 13, color: MUTED }}>{current.answer}</span>}
              </div>
            )}
            <span
              style={{
                alignSelf: "center",
                fontSize: 12.5,
                padding: "5px 10px",
                borderRadius: 999,
                background: status === "drawn" ? "rgba(216,182,103,0.15)" : status === "pending" ? "rgba(143,237,176,0.12)" : "rgba(251,243,236,0.1)",
                color: status === "drawn" ? GOLD : status === "pending" ? GREEN : CREAM,
              }}
            >
              {status === "drawn"
                ? "Only you can see this"
                : status === "pending"
                  ? `Guests see it in ${Math.max(1, Math.ceil(((pendingVisible ?? now) - now) / 1000))}s`
                  : "Live on guests' phones"}
            </span>
          </div>
        ) : (
          <div style={{ ...panel, borderStyle: "dashed", padding: "26px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22 }}>Ready for round {roundNumber}</span>
            <span style={{ fontSize: 13, color: MUTED }}>Tap Draw next. Only this phone sees the line until you tap Called.</span>
          </div>
        )}

        {!ended && !deckEmpty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => act("call")} disabled={!canCall} style={bigButton(canCall)}>
              {busy === "call" ? "Calling…" : "Called"}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
              <button onClick={() => act("draw")} disabled={!canDraw} style={bigButton(canDraw, "cream")}>
                {busy === "draw" ? "Drawing…" : exhausted ? "Deck's empty" : "Draw next"}
              </button>
              <button onClick={() => act("undo")} disabled={!canUndo} style={bigButton(canUndo, "ghost")}>
                Undo
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={label}>Called so far · A–Z, for checking cards</span>
          {called.length === 0 ? (
            <span style={{ fontSize: 13, color: MUTED }}>Nothing yet.</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {called.map((name) => (
                <span key={name} style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, background: name === current?.card ? "rgba(216,182,103,0.18)" : "rgba(251,243,236,0.08)", color: name === current?.card ? GOLD : CREAM }}>
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "12px 16px calc(18px + env(safe-area-inset-bottom))", borderTop: LINE, display: "flex", flexDirection: "column", gap: 8 }}>
        {ended ? (
          lastRound ? (
            <span style={{ textAlign: "center", fontSize: 13, color: MUTED }}>Bingo&apos;s done for tonight.</span>
          ) : (
            <button onClick={() => act("new_round")} disabled={!!busy || !online} style={bigButton(!busy && online, "gold")}>
              {busy === "new_round" ? "Starting…" : `Start round ${roundNumber + 1}`}
            </button>
          )
        ) : winnerOpen ? (
          <>
            <label htmlFor="ln-winner" style={label}>Winner&apos;s first name (shows on the live page)</label>
            <input id="ln-winner" value={winner} maxLength={60} onChange={(e) => setWinner(e.target.value)} placeholder="Tasha" style={fieldInput} autoFocus />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
              <button
                onClick={() => {
                  act("bingo", { winner: winner.trim() });
                  setWinnerOpen(false);
                  setWinner("");
                }}
                disabled={!!busy || !online}
                style={bigButton(!busy && online, "gold")}
              >
                {lastRound ? "Announce & end bingo" : "Announce winner"}
              </button>
              <button onClick={() => setWinnerOpen(false)} style={bigButton(true, "ghost")}>Cancel</button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setWinnerOpen(true)}
            disabled={!round || someoneElse || !!busy || !online || draws.length === 0}
            style={{ ...bigButton(!!round && !someoneElse && draws.length > 0, "ghost"), border: `1.5px solid ${GOLD}`, color: GOLD, fontFamily: "Georgia, serif", fontStyle: "italic", textTransform: "none", letterSpacing: 0, fontSize: 22, minHeight: 56 }}
          >
            Someone has BINGO!
          </button>
        )}
      </div>
    </>
  );
}

// ---------------- Guests ----------------

function GuestsTab({ showId }: { showId: string | null }) {
  const { data, online } = useLiveData<{ counts?: { rsvps: number; checked_in: number }; guests?: GuestRow[] }>(
    `/api/admin/ladies-night/checkin?prep=1${showId ? `&show=${showId}` : ""}`,
    10_000
  );
  const [q, setQ] = useState("");
  const guests = data?.guests ?? [];
  const filtered = q.trim()
    ? guests.filter((g) => `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(q.trim().toLowerCase()))
    : guests;
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Reconnecting online={online} />
      <div style={{ padding: "14px 16px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24 }}>{data?.counts?.rsvps ?? "…"} RSVP&apos;d</span>
          <a href={`/api/admin/ladies-night/checkin?format=csv${showId ? `&show=${showId}` : ""}`} style={{ fontSize: 12, color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
            Download ↓
          </a>
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names or emails" aria-label="Search guests" style={fieldInput} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", borderTop: LINE, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {filtered.map((g) => (
          <div key={g.rsvp_id} style={{ padding: "11px 16px", borderBottom: LINE, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15 }}>{g.first_name} {g.last_name}</div>
              <div style={{ fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.email}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {g.party_size ? <Chip>Table · {g.party_size}</Chip> : null}
              {g.vip_passes > 0 && <Chip>VIP × {g.vip_passes}</Chip>}
            </div>
          </div>
        ))}
        {data && filtered.length === 0 && <p style={{ padding: 16, margin: 0, color: MUTED, fontSize: 14 }}>{guests.length ? "No one matches that." : "No RSVPs yet."}</p>}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, color: MUTED, border: "1px solid rgba(251,243,236,0.25)", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{children}</span>;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dur: 1.8 + Math.random() * 1.6,
        delay: Math.random() * 1.1,
      })),
    []
  );
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="ln-confetti"
          style={{ position: "absolute", top: 0, left: `${p.left}%`, width: p.w, height: p.h, background: p.color, animation: `ln-fall ${p.dur}s linear ${p.delay}s forwards`, opacity: 0 }}
        />
      ))}
    </div>
  );
}
