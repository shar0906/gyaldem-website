// admin/showtime/HostBingo.tsx
//
// The bingo caller on show night. Draw pulls a line nobody has heard yet
// this round; the host reads it and guests mark the artist on their
// printed cards. One phone holds the mic at a time; any other host phone
// follows along and can take over. Bingo ends the round with confetti;
// Reset starts the next one.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveData } from "./useLiveData";
import { CREAM, Centered, GOLD, LINE, MUTED, RED, Reconnecting, SOFT_RED, TopBar, screen } from "./ui";

type Draw = { order: number; line: string; song: string; artist: string; drawn_at: string };
type BingoData = {
  show: { id: string; title: string; event_date: string } | null;
  round?: { id: string; number: number; ended: boolean; caller: { email: string | null; since: string | null; is_you: boolean } | null } | null;
  draws?: Draw[];
  last_order?: number;
  deck_size?: number;
  exhausted?: boolean;
};

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
};

export default function HostBingo({ onLogout }: { onLogout?: () => void }) {
  const [device, setDevice] = useState<string | null>(null);
  useEffect(() => setDevice(deviceId()), []);

  const { data, setData, online, authError, refresh } = useLiveData<BingoData>(
    `/api/admin/ladies-night/bingo?device=${device ?? ""}`
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  // Confetti whenever this phone sees a round flip to ended.
  const lastEnded = useRef<string | null>(null);
  useEffect(() => {
    const r = data?.round;
    if (r?.ended && lastEnded.current !== r.id) {
      if (lastEnded.current !== null || busy === "bingo") setCelebrate((n) => n + 1);
      lastEnded.current = r.id;
    } else if (r && !r.ended && lastEnded.current === null) {
      lastEnded.current = "";
    }
  }, [data?.round, busy]);

  async function act(action: "draw" | "undo" | "bingo" | "new_round" | "take_over") {
    if (!device || !data) return;
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ladies-night/bingo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, device, last_seen: data.last_order ?? 0 }),
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

  const draws = data?.draws ?? [];
  const current = draws[draws.length - 1] ?? null;
  const called = useMemo(() => [...new Set(draws.map((d) => d.artist))].sort((a, b) => a.localeCompare(b)), [draws]);

  if (authError) {
    return (
      <div style={screen}>
        <TopBar label="Host · Bingo" onLogout={onLogout} />
        <Centered>
          <p style={{ margin: 0 }}>Your login expired.</p>
          <button onClick={() => location.reload()} style={primary(true)}>Sign in again</button>
        </Centered>
      </div>
    );
  }
  if (!data || !device) {
    return (
      <div style={screen}>
        <TopBar label="Host · Bingo" onLogout={onLogout} />
        <Reconnecting online={online} />
        <Centered><span style={{ color: MUTED }}>Loading…</span></Centered>
      </div>
    );
  }
  if (!data.show) {
    return (
      <div style={screen}>
        <TopBar label="Host · Bingo" onLogout={onLogout} />
        <Centered>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24 }}>No show tonight</span>
          <span style={{ color: MUTED, fontSize: 14 }}>The bingo caller opens on the night of the show.</span>
        </Centered>
      </div>
    );
  }

  const round = data.round ?? null;
  const roundNumber = round?.number ?? 1;
  const ended = !!round?.ended;
  const someoneElse = !!round && !round.ended && !!round.caller && !round.caller.is_you;
  const deckEmpty = (data.deck_size ?? 0) === 0;
  const canDraw = online && !busy && !ended && !someoneElse && !exhausted && !deckEmpty;

  return (
    <div style={{ ...screen, height: "100dvh", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes ln-fall { 0% { transform: translateY(-40px) rotate(0deg); opacity: 1; } 100% { transform: translateY(105dvh) rotate(720deg); opacity: .9; } }
        @media (prefers-reduced-motion: reduce) { .ln-confetti { display: none; } }
      `}</style>
      <TopBar label="Host · Bingo" onLogout={onLogout} right={<span style={{ fontSize: 12, color: MUTED }}>Round {roundNumber} · {draws.length} of {data.deck_size} called</span>} />
      <Reconnecting online={online} />

      {someoneElse && (
        <div style={{ padding: "10px 20px", borderBottom: LINE, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(216,182,103,0.08)" }}>
          <span style={{ fontSize: 13, color: GOLD }}>{round?.caller?.email ?? "Another phone"} is calling. You&apos;re following along.</span>
          <button
            onClick={() => confirm("Take over calling from the other phone?") && act("take_over")}
            disabled={!!busy || !online}
            style={{ flex: "none", minHeight: 40, padding: "0 12px", background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Take over
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 20px 12px", display: "flex", flexDirection: "column", gap: 16 }}>
        {deckEmpty ? (
          <div style={{ border: "1px dashed rgba(245,240,232,0.25)", padding: "28px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22 }}>The deck is empty</span>
            <span style={{ fontSize: 13, color: MUTED }}>Add lines in admin under Ladies Night, Bingo deck.</span>
          </div>
        ) : current && !ended ? (
          <div aria-live="polite" style={{ border: "1px solid rgba(216,182,103,0.4)", background: "linear-gradient(160deg, #1E1416, #120C0D)", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD }}>Read this line · #{current.order}</span>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24, lineHeight: 1.3, overflowWrap: "anywhere" }}>“{current.line}”</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 12, borderTop: LINE }}>
              <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: MUTED }}>Answer on the card</span>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{current.artist}</span>
              <span style={{ fontSize: 13, color: MUTED }}>from “{current.song}”</span>
            </div>
          </div>
        ) : ended ? (
          <div style={{ border: `1px solid ${GOLD}`, padding: "28px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 26, color: GOLD }}>We have a winner</span>
            <span style={{ fontSize: 13, color: MUTED }}>Round {roundNumber} is over. Reset to start round {roundNumber + 1}.</span>
          </div>
        ) : (
          <div style={{ border: "1px dashed rgba(245,240,232,0.25)", padding: "28px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22 }}>Ready for round {roundNumber}</span>
            <span style={{ fontSize: 13, color: MUTED }}>Tap Draw to pull the first line. Nothing repeats until you reset.</span>
          </div>
        )}

        {!ended && !deckEmpty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => act("draw")} disabled={!canDraw} style={primary(canDraw)}>
              {busy === "draw" ? "Drawing…" : exhausted ? "Every line has been called" : "Draw next line"}
            </button>
            {draws.length > 0 && !someoneElse && (
              <button onClick={() => act("undo")} disabled={!!busy || !online} style={{ minHeight: 44, background: "none", border: 0, color: MUTED, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                Undo last draw
              </button>
            )}
          </div>
        )}

        {message && <p role="status" style={{ margin: 0, fontSize: 13, color: message.ok ? CREAM : SOFT_RED }}>{message.text}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>Called so far · A–Z, for checking cards</span>
          {called.length === 0 ? (
            <span style={{ fontSize: 13, color: MUTED }}>Nothing yet.</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {called.map((name) => {
                const latest = name === current?.artist && !ended;
                return (
                  <span key={name} style={{ fontSize: 13, padding: "6px 10px", border: `1px solid ${latest ? GOLD : "rgba(245,240,232,0.25)"}`, color: latest ? GOLD : CREAM }}>
                    {name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "12px 20px calc(20px + env(safe-area-inset-bottom))", borderTop: LINE }}>
        {ended ? (
          <button onClick={() => act("new_round")} disabled={!!busy || !online} style={{ ...primary(!busy && online), background: GOLD, color: "#0A0A0A" }}>
            {busy === "new_round" ? "Starting…" : `Reset for round ${roundNumber + 1}`}
          </button>
        ) : (
          <button
            onClick={() => act("bingo")}
            disabled={!round || someoneElse || !!busy || !online || draws.length === 0}
            style={{
              width: "100%",
              height: 58,
              border: `1.5px solid ${GOLD}`,
              background: "transparent",
              color: GOLD,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 24,
              cursor: "pointer",
              opacity: !round || someoneElse || draws.length === 0 ? 0.4 : 1,
            }}
          >
            Bingo!
          </button>
        )}
      </div>

      {celebrate > 0 && <Confetti key={celebrate} />}
    </div>
  );
}

function primary(enabled: boolean) {
  return {
    width: "100%",
    height: 56,
    border: 0,
    background: enabled ? RED : "rgba(245,240,232,0.1)",
    color: enabled ? CREAM : MUTED,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    cursor: enabled ? "pointer" : "default",
    fontFamily: "inherit",
  };
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
