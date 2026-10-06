// ladies-night/VipStep.tsx
//
// "Thanks for voting" plus the VIP offer: passes for the guest's party
// (up to 5 per RSVP in total), paid on Stripe's checkout page.

"use client";

import { useState } from "react";
import { CREAM, CREAM_DIM, CheckIcon, ErrorText, Footer, GOLD, Glow, Guest, INK, OpenCurrent, SANS, SERIF, V, card, cta, errorFor, eyebrow, h1, post, sub, textLink } from "./shared";

const VIP_ERRORS: Record<string, string> = {
  sold_out: "VIP just sold out. Sorry about that.",
  vip_closed: "VIP sales have closed for this show.",
  rsvp_limit: "That's more than 5 passes for one RSVP.",
};

export default function VipStep({
  current,
  guest,
  justVoted,
  onSkip,
}: {
  current: OpenCurrent;
  guest: Guest;
  justVoted: boolean;
  onSkip: () => void;
}) {
  const have = guest.rsvp?.vip_passes ?? 0;
  const maxMore = Math.max(0, 5 - have);
  const [qty, setQty] = useState(Math.min(have ? 1 : 2, maxMore) || 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vip = current.vip.enabled ? current.vip : null;
  if (!vip) return null;

  const price = vip.price_cents / 100;
  const perks = (vip.perks ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const total = (qty * vip.price_cents) / 100;
  const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

  async function checkout() {
    setBusy(true);
    setError(null);
    const res = await post<{ url: string }>("/api/ladies-night/vip/checkout", { quantity: qty });
    if (res.ok && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setBusy(false);
    setError(VIP_ERRORS[res.data.error ?? ""] ?? errorFor(res.data));
  }

  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 440, margin: "0 auto", boxSizing: "border-box", padding: "32px 16px calc(26px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 18, color: CREAM, fontFamily: SANS }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 6px" }}>
        <span style={eyebrow}>{current.show.title}</span>
        <h1 style={h1}>{justVoted ? "Thanks for voting." : have ? "Add more VIP passes" : "Make it VIP"}</h1>
        {justVoted && <p style={sub}>Your picks are in and you&apos;re on the RSVP list. You can change your picks until voting closes.</p>}
        {have > 0 && <p style={sub}>You have {have} VIP pass{have === 1 ? "" : "es"}. You can add up to {maxMore} more.</p>}
      </div>

      <section style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }} aria-label="VIP passes">
        <Glow />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD }}>Make it VIP</span>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 26 }}>
            {money(price)}
            <span style={{ fontFamily: SANS, fontStyle: "normal", fontWeight: 400, fontSize: 13, color: "rgba(251,243,236,0.75)" }}> per pass</span>
          </span>
        </div>
        {perks.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9, fontSize: 15 }}>
            {perks.map((p) => (
              <li key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckIcon color={GOLD} /> {p.charAt(0).toUpperCase() + p.slice(1)}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CREAM, color: INK, borderRadius: 14, padding: "8px 8px 8px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Passes for your party</span>
            <span style={{ fontSize: 12, color: "#6B4B4F" }}>Up to {maxMore}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Fewer passes" style={{ width: 44, height: 44, borderRadius: 999, border: 0, background: CREAM_DIM, color: INK, fontSize: 20, cursor: "pointer", opacity: qty <= 1 ? 0.4 : 1 }}>−</button>
            <span aria-live="polite" style={{ minWidth: 28, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 21 }}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(maxMore, q + 1))} disabled={qty >= maxMore} aria-label="More passes" style={{ width: 44, height: 44, borderRadius: 999, border: 0, background: V.accent, color: CREAM, fontSize: 20, cursor: "pointer", opacity: qty >= maxMore ? 0.4 : 1 }}>+</button>
          </div>
        </div>
        <button onClick={checkout} disabled={busy} style={{ ...cta(!busy), marginTop: 4 }}>{busy ? "Opening checkout…" : `Get VIP · ${money(total)} →`}</button>
        {error && <ErrorText>{error}</ErrorText>}
        <span style={{ fontSize: 11.5, textAlign: "center", color: "rgba(251,243,236,0.65)" }}>Secure checkout with Stripe · VIP closes 48 hours before the show</span>
      </section>
      <button onClick={onSkip} style={{ ...textLink, color: "rgba(251,243,236,0.8)" }}>{justVoted ? "No thanks, continue" : "Not now"}</button>
      <div style={{ flex: 1 }} />
      <Footer />
    </main>
  );
}
