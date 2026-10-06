// lib/ln/stripe.ts
//
// Stripe for VIP passes, with test and live set up side by side.
//
// Env:
//   STRIPE_MODE                  "test" or "live": which key new checkouts use
//   STRIPE_SECRET_KEY_TEST       sk_test_...
//   STRIPE_SECRET_KEY_LIVE       sk_live_...
//   STRIPE_WEBHOOK_SECRET_TEST   whsec_... from the Sandbox webhook endpoint
//   STRIPE_WEBHOOK_SECRET_LIVE   whsec_... from the live webhook endpoint
//
// Older single-key setups still work: STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET are used when the _TEST/_LIVE versions are missing,
// and the mode is read from the key itself.
//
// Webhooks from both endpoints are always accepted (each checked against
// its own secret), so test orders keep updating after you switch to live.

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StripeMode = "test" | "live";

const clients: Partial<Record<StripeMode, Stripe>> = {};

function legacyKeyMode(): StripeMode | null {
  const k = process.env.STRIPE_SECRET_KEY ?? "";
  if (k.startsWith("sk_test_") || k.startsWith("rk_test_")) return "test";
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) return "live";
  return null;
}

function keyFor(mode: StripeMode): string | undefined {
  const specific = mode === "test" ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY_LIVE;
  if (specific) return specific;
  return legacyKeyMode() === mode ? process.env.STRIPE_SECRET_KEY : undefined;
}

// Which mode new checkouts use.
export function stripeMode(): StripeMode | null {
  const m = process.env.STRIPE_MODE?.trim().toLowerCase();
  if (m === "test" || m === "live") return keyFor(m) ? m : null;
  return legacyKeyMode();
}

export function stripe(mode: StripeMode | null = stripeMode()): Stripe | null {
  if (!mode) return null;
  const key = keyFor(mode);
  if (!key) return null;
  clients[mode] ??= new Stripe(key);
  return clients[mode]!;
}

// The right client for an existing checkout, going by its id (cs_test_/cs_live_).
export function stripeForSession(sessionId: string): Stripe | null {
  return stripe(sessionId.startsWith("cs_live_") ? "live" : "test");
}

// Every configured webhook secret, labeled by mode.
export function webhookSecrets(): { mode: StripeMode; secret: string }[] {
  const out: { mode: StripeMode; secret: string }[] = [];
  if (process.env.STRIPE_WEBHOOK_SECRET_TEST) out.push({ mode: "test", secret: process.env.STRIPE_WEBHOOK_SECRET_TEST });
  if (process.env.STRIPE_WEBHOOK_SECRET_LIVE) out.push({ mode: "live", secret: process.env.STRIPE_WEBHOOK_SECRET_LIVE });
  if (process.env.STRIPE_WEBHOOK_SECRET && !out.some((s) => s.secret === process.env.STRIPE_WEBHOOK_SECRET)) {
    out.push({ mode: legacyKeyMode() ?? "live", secret: process.env.STRIPE_WEBHOOK_SECRET });
  }
  return out;
}

// Verifies a webhook against each configured secret. Returns the event
// only when one matches and the event's own test/live flag agrees.
export function verifyWebhook(payload: string, signature: string): Stripe.Event | null {
  const verifier = stripe("test") ?? stripe("live") ?? new Stripe("sk_test_unused");
  for (const { mode, secret } of webhookSecrets()) {
    try {
      const event = verifier.webhooks.constructEvent(payload, signature, secret);
      if (event.livemode === (mode === "live")) return event;
    } catch {
      /* not this endpoint's secret; try the next */
    }
  }
  return null;
}

// Marks an order paid from a Stripe Checkout Session. Safe to call more
// than once (the webhook and the return page can both confirm the same
// payment). An order whose hold had already expired still becomes paid:
// the guest paid, so they get their passes.
export async function markOrderPaid(db: SupabaseClient, session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.payment_status !== "paid") return false;
  const orderId = session.metadata?.order_id;
  if (!orderId) return false;
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const { error } = await db
    .from("ln_vip_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntent })
    .eq("id", orderId)
    .in("status", ["pending", "expired"]);
  if (error) throw error;
  return true;
}
