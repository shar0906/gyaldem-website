// admin/showtime/DoorCheckIn.tsx
//
// The door on show night. Search tonight's RSVPs by first name, last
// name, or email; tap Check in (tap again to undo). Live counts at the
// top. Walk-ins scan the QR on their own phone, or the door types them
// in. Every door phone sees the others' check-ins within seconds.

"use client";

import { useMemo, useState } from "react";
import { useLiveData } from "./useLiveData";
import { CREAM, Centered, GREEN, LINE, MUTED, RED, Reconnecting, SOFT_RED, TopBar, screen } from "./ui";

type Guest = {
  rsvp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  vip_passes: number;
  walk_in: boolean;
  party_size?: number | null;
  checked_in_at: string | null;
};
type CheckinData = {
  show: { id: string; title: string; event_date: string; event_start_time: string; artist_name: string | null; venue_name: string | null } | null;
  counts?: { rsvps: number; checked_in: number; vip_passes: number; vip_passes_in: number };
  guests?: Guest[];
};

const fieldInput = {
  height: 46,
  boxSizing: "border-box" as const,
  padding: "0 12px",
  border: "1px solid rgba(245,240,232,0.2)",
  background: "#1A1717",
  color: CREAM,
  fontSize: 16,
  fontFamily: "inherit",
  width: "100%",
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export default function DoorCheckIn({ onLogout }: { onLogout?: () => void }) {
  const { data, online, authError, refresh } = useLiveData<CheckinData>("/api/admin/ladies-night/checkin");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"list" | "walkin">("list");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // Show the tap right away; the next refresh confirms it.
  const guests = useMemo(
    () =>
      (data?.guests ?? []).map((g) =>
        g.rsvp_id in pending ? { ...g, checked_in_at: pending[g.rsvp_id] ? g.checked_in_at ?? new Date().toISOString() : null } : g
      ),
    [data, pending]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q)
    );
  }, [guests, query]);

  async function toggle(g: Guest) {
    const next = !g.checked_in_at;
    setPending((p) => ({ ...p, [g.rsvp_id]: next }));
    setToast(null);
    try {
      const res = await fetch("/api/admin/ladies-night/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvp_id: g.rsvp_id, checked_in: next }),
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setToast({ ok: false, text: `Couldn't update ${g.first_name}. Check the connection and tap again.` });
    }
    setPending((p) => {
      const { [g.rsvp_id]: _done, ...rest } = p;
      return rest;
    });
  }

  if (authError) {
    return (
      <div style={screen}>
        <TopBar label="Door check-in" onLogout={onLogout} />
        <Centered>
          <p style={{ margin: 0 }}>Your login expired.</p>
          <button onClick={() => location.reload()} style={bigButton(true)}>Sign in again</button>
        </Centered>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={screen}>
        <TopBar label="Door check-in" onLogout={onLogout} />
        <Reconnecting online={online} />
        <Centered><span style={{ color: MUTED }}>Loading tonight&apos;s list…</span></Centered>
      </div>
    );
  }
  if (!data.show) {
    return (
      <div style={screen}>
        <TopBar label="Door check-in" onLogout={onLogout} />
        <Centered>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 24 }}>No show tonight</span>
          <span style={{ color: MUTED, fontSize: 14 }}>Check-in opens on the night of the show.</span>
        </Centered>
      </div>
    );
  }

  if (view === "walkin") {
    return (
      <WalkIn
        artist={data.show.artist_name}
        onBack={() => setView("list")}
        onDone={(name) => {
          setView("list");
          setToast({ ok: true, text: `${name} is RSVP'd and checked in.` });
          refresh();
        }}
      />
    );
  }

  const counts = data.counts!;
  const checkedIn = guests.filter((g) => g.checked_in_at).length;
  const vipIn = guests.reduce((n, g) => n + (g.checked_in_at ? g.vip_passes : 0), 0);
  const dateText = new Date(`${data.show.event_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div style={{ ...screen, height: "100dvh" }}>
      <TopBar label="Door check-in" onLogout={onLogout} />
      <Reconnecting online={online} />
      <div style={{ padding: "18px 20px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#c86b6b" }}>Tonight</span>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 26, lineHeight: 1.15 }}>{data.show.title}</h1>
        <span style={{ fontSize: 13, color: MUTED }}>
          {data.show.artist_name ? `with ${data.show.artist_name} · ` : ""}
          {dateText}{data.show.venue_name ? ` · ${data.show.venue_name}` : ""}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 20px 14px" }}>
        <Count name="Checked in" value={checkedIn} of={counts.rsvps} />
        <Count name="VIP passes in" value={vipIn} of={counts.vip_passes} />
      </div>
      <div style={{ padding: "0 20px 12px" }}>
        <label htmlFor="door-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search guests</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 14px", background: "#1A1717", border: "1px solid rgba(245,240,232,0.16)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            id="door-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="First name, last name, or email"
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, height: "100%", border: 0, outline: "none", background: "transparent", color: CREAM, fontSize: 16, fontFamily: "inherit" }}
          />
        </div>
      </div>
      {toast && (
        <p role="status" style={{ margin: 0, padding: "8px 20px", fontSize: 13, color: toast.ok ? GREEN : SOFT_RED }}>{toast.text}</p>
      )}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", borderTop: LINE }}>
        {filtered.map((g) => {
          const name = `${g.first_name} ${g.last_name}`.trim();
          const busy = g.rsvp_id in pending;
          return (
            <div key={g.rsvp_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: LINE }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>{name}</span>
                  {g.vip_passes > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#c86b6b", border: "1px solid #c86b6b", borderRadius: 999, padding: "2px 8px" }}>VIP × {g.vip_passes}</span>}
                  {g.party_size ? <span style={{ fontSize: 11, color: MUTED, border: "1px solid rgba(245,240,232,0.25)", borderRadius: 999, padding: "2px 8px" }}>Table for {g.party_size}</span> : null}
                  {g.walk_in && <span style={{ fontSize: 11, color: MUTED, border: "1px solid rgba(245,240,232,0.25)", borderRadius: 999, padding: "2px 8px" }}>Walk-in</span>}
                </div>
                <span style={{ fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.email}</span>
              </div>
              {g.checked_in_at ? (
                <button
                  onClick={() => toggle(g)}
                  disabled={busy}
                  aria-label={`${name} checked in at ${timeOf(g.checked_in_at)}. Tap to undo.`}
                  style={{ flex: "none", width: 116, height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px solid ${GREEN}`, background: "transparent", color: GREEN, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  {timeOf(g.checked_in_at)}
                </button>
              ) : (
                <button
                  onClick={() => toggle(g)}
                  disabled={busy}
                  aria-label={`Check in ${name}`}
                  style={{ flex: "none", width: 116, height: 44, border: 0, background: RED, color: CREAM, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Check in
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 15 }}>{guests.length ? `No one matches “${query}”.` : "No RSVPs yet."}</span>
            <span style={{ fontSize: 13, color: MUTED }}>Check the spelling, or add them as a walk-in.</span>
          </div>
        )}
      </div>
      <div style={{ padding: "14px 20px calc(18px + env(safe-area-inset-bottom))", borderTop: LINE }}>
        <button onClick={() => setView("walkin")} style={{ width: "100%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1px solid ${CREAM}`, background: "transparent", color: CREAM, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>+</span> Add walk-in
        </button>
      </div>
    </div>
  );
}

function Count({ name, value, of }: { name: string; value: number; of: number }) {
  return (
    <div style={{ border: "1px solid rgba(245,240,232,0.16)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>{name}</span>
      <span style={{ fontSize: 24, fontWeight: 600 }}>
        {value}
        <span style={{ fontSize: 15, fontWeight: 400, color: MUTED }}> / {of}</span>
      </span>
    </div>
  );
}

function bigButton(enabled: boolean) {
  return {
    height: 52,
    width: "100%",
    border: 0,
    background: enabled ? RED : "rgba(245,240,232,0.1)",
    color: enabled ? CREAM : MUTED,
    fontSize: 15,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "default",
    fontFamily: "inherit",
  } as const;
}

function WalkIn({ artist, onBack, onDone }: { artist: string | null; onBack: () => void; onDone: (name: string) => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const ready = first.trim() && last.trim() && email.trim() && consent && !busy;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ladies-night/checkin/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: first, last_name: last, email, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? (data.error === "no_show_tonight" ? "There's no show tonight." : "Couldn't add them. Try again."));
      } else {
        onDone(`${first.trim()} ${last.trim()}`);
      }
    } catch {
      setError("Couldn't reach the server. Check the connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div style={screen}>
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: LINE }}>
        <button onClick={onBack} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 4, background: "none", border: 0, color: CREAM, fontSize: 15, cursor: "pointer", padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          Check-in
        </button>
        {artist && <span style={{ fontSize: 12, color: MUTED }}>Ladies Night · with {artist}</span>}
      </div>
      <div style={{ padding: "18px 20px calc(24px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: 30 }}>Walk-in</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 236, height: 236, background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" }}>
            {qrFailed ? (
              <span style={{ color: "#4A4640", fontSize: 13, textAlign: "center", padding: 12 }}>Couldn&apos;t load the QR code. Use the form below.</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/api/admin/ladies-night/checkin/qr" alt="QR code for tonight's walk-in sign-up" width={220} height={220} onError={() => setQrFailed(true)} />
            )}
          </div>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>Scan with your phone camera</span>
            <span style={{ fontSize: 13, color: MUTED, maxWidth: 290 }}>You&apos;ll RSVP on your phone and be checked in automatically.</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.16)" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>No phone?</span>
          <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.16)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: MUTED }}>
              First name
              <input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="off" style={fieldInput} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: MUTED }}>
              Last name
              <input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="off" style={fieldInput} />
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: MUTED }}>
            Email
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" style={fieldInput} />
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingTop: 4, fontSize: 13, lineHeight: 1.4, color: "#D9D4CB", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 22, height: 22, margin: 0, flex: "none", accentColor: RED }} />
            Guest agreed to RSVP and join the Gyal Dem mailing list
          </label>
        </div>
        {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: SOFT_RED }}>{error}</p>}
        <button onClick={submit} disabled={!ready} style={bigButton(!!ready)}>{busy ? "Adding…" : "RSVP and check in"}</button>
      </div>
    </div>
  );
}
