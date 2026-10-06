// ladies-night/LadiesNightApp.tsx
//
// Decides which screen a guest sees, based on the show's stage and what
// they've already done:
//   none / coming soon -> countdown
//   not in yet          -> gate (prefilled if this device knows them)
//   door QR             -> checked in
//   voting open, no vote-> ballot
//   then                -> VIP offer (fresh visits, when available)
//   always ends at      -> summary (table, calendar, picks, VIP)
// Also handles coming back from Stripe checkout.

"use client";

import { CSSProperties, useCallback, useEffect, useState } from "react";
import Ballot from "./Ballot";
import CheckedIn from "./CheckedIn";
import ComingSoon from "./ComingSoon";
import Gate from "./Gate";
import Summary from "./Summary";
import VipStep from "./VipStep";
import { CREAM, Current, Guest, OpenCurrent, Prefill, SANS, cta, post } from "./shared";
import { ballotTheme } from "../lib/ln/theme";

type Step = "loading" | "error" | "none" | "coming_soon" | "gate" | "checked_in" | "ballot" | "vip" | "summary";

function vipOpen(current: OpenCurrent, guest: Guest): boolean {
  const v = current.vip;
  return v.enabled && !v.closed && !v.sold_out && (guest.rsvp?.vip_passes ?? 0) < 5;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function LadiesNightApp() {
  const [step, setStep] = useState<Step>("loading");
  const [current, setCurrent] = useState<Current | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [prefill, setPrefill] = useState<Prefill>(null);
  const [doorCode, setDoorCode] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [changing, setChanging] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setStep("loading");
    const params = new URLSearchParams(window.location.search);
    const door = params.get("door");
    setDoorCode(door);
    try {
      const [cur, me] = await Promise.all([
        getJson<Current>(`/api/ladies-night/current${door ? `?door=${encodeURIComponent(door)}` : ""}`),
        getJson<{ guest: Guest | null; prefill?: Prefill }>("/api/ladies-night/me"),
      ]);
      setCurrent(cur);
      if (cur.stage === "none") return setStep("none");
      if (!("show" in cur)) return setStep("coming_soon");

      if (!me.guest || !me.guest.rsvp) {
        setPrefill(me.prefill ?? null);
        return setStep("gate");
      }

      // Remembered device scanning the door QR: one-tap check-in.
      if (cur.door && door) {
        const res = await post<{ guest: Guest }>("/api/ladies-night/door", { door });
        setGuest(res.ok ? res.data.guest : me.guest);
        return setStep(res.ok ? "checked_in" : "gate");
      }

      setGuest(me.guest);
      setWelcome(true);

      // Back from Stripe.
      const vip = params.get("vip");
      const sessionId = params.get("session_id");
      if (vip) {
        const clean = new URL(window.location.href);
        clean.searchParams.delete("vip");
        clean.searchParams.delete("session_id");
        window.history.replaceState(null, "", clean.toString());
        setWelcome(false);
        if (vip === "success" && sessionId) {
          let paid: { status: string; quantity: number } | null = null;
          for (let i = 0; i < 8 && paid?.status !== "paid"; i++) {
            try {
              paid = await getJson(`/api/ladies-night/vip/status?session_id=${encodeURIComponent(sessionId)}`);
            } catch {
              /* keep trying briefly */
            }
            if (paid?.status !== "paid") await new Promise((r) => setTimeout(r, 1500));
          }
          const fresh = await getJson<{ guest: Guest | null }>("/api/ladies-night/me").catch(() => null);
          if (fresh?.guest) setGuest(fresh.guest);
          setNotice(
            paid?.status === "paid"
              ? { ok: true, text: `You're VIP. ${paid.quantity} pass${paid.quantity === 1 ? "" : "es"} confirmed; your receipt is in your email.` }
              : { ok: true, text: "Payment received. Your VIP passes will show here in a minute; your receipt is in your email." }
          );
        } else {
          setNotice({ ok: false, text: "Checkout was cancelled. You weren't charged." });
        }
        return setStep("summary");
      }

      setStep(cur.stage === "voting_open" && !me.guest.voted ? "ballot" : "summary");
    } catch {
      setStep("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = current && "show" in current ? (current as OpenCurrent) : null;

  function afterGate(g: Guest) {
    setGuest(g);
    setWelcome(false);
    if (!open) return;
    if (open.door) return setStep("checked_in");
    if (open.stage === "voting_open" && !g.voted) return setStep("ballot");
    if (vipOpen(open, g)) return setStep("vip");
    setStep("summary");
  }

  function afterVote(g: Guest) {
    setGuest(g);
    setJustVoted(true);
    if (!open) return;
    if (changing) {
      setChanging(false);
      setNotice({ ok: true, text: "Your picks are saved." });
      return setStep("summary");
    }
    if (!welcome && vipOpen(open, g)) return setStep("vip");
    setNotice({ ok: true, text: "Thanks for voting. Your picks are in." });
    setStep("summary");
  }

  async function notYou() {
    await post("/api/ladies-night/forget");
    setGuest(null);
    setPrefill(null);
    setWelcome(false);
    setNotice(null);
    setStep("gate");
  }

  const theme = ballotTheme(open?.artist?.primary_color, open?.artist?.accent_color);
  const vars = {
    "--ln-primary": theme.primary,
    "--ln-deep": theme.deep,
    "--ln-accent": theme.accent,
    "--ln-accent-soft": theme.accentSoft,
    minHeight: "100dvh",
    background: `radial-gradient(ellipse at top, rgba(255,255,255,0.05), transparent 60%), ${theme.deep}`,
    color: CREAM,
    fontFamily: SANS,
    WebkitFontSmoothing: "antialiased",
  } as CSSProperties;

  return (
    <div style={vars}>
      <style>{`
        html, body { background: ${theme.deep} !important; }
        .ln-root button:focus-visible, .ln-root a:focus-visible, .ln-root input:focus-visible { outline: 2px solid #D8B667; outline-offset: 2px; }
        .ln-root input::placeholder { color: rgba(251,243,236,0.4); }
      `}</style>
      <div className="ln-root">
        {step === "loading" && (
          <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(251,243,236,0.6)" }}>Loading…</div>
        )}
        {step === "error" && (
          <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
            <p style={{ margin: 0 }}>We couldn&apos;t load Ladies Night just now.</p>
            <button onClick={load} style={{ ...cta(), maxWidth: 240 }}>Try again</button>
          </div>
        )}
        {(step === "none" || step === "coming_soon") && (
          <ComingSoon opensAt={current && "rsvp_opens_at" in current ? current.rsvp_opens_at : null} onOpen={load} />
        )}
        {step === "gate" && open && <Gate current={open} prefill={prefill} doorCode={doorCode} onEntered={afterGate} />}
        {step === "checked_in" && open && guest && <CheckedIn current={open} guest={guest} />}
        {step === "ballot" && open && guest && (
          <Ballot current={open} guest={guest} welcome={welcome && !changing} changing={changing} onSubmitted={afterVote} onNotYou={notYou} />
        )}
        {step === "vip" && open && guest && <VipStep current={open} guest={guest} justVoted={justVoted} onSkip={() => setStep("summary")} />}
        {step === "summary" && open && guest && (
          <Summary
            current={open}
            guest={guest}
            welcome={welcome}
            notice={notice}
            onGuest={setGuest}
            onChangePicks={() => {
              setChanging(true);
              setNotice(null);
              setStep("ballot");
            }}
            onVip={() => {
              setJustVoted(false);
              setStep("vip");
            }}
            onNotYou={notYou}
          />
        )}
      </div>
    </div>
  );
}
