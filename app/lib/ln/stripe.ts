// lib/ln/stripe.ts
//
// Stripe for VIP passes.
// Env: STRIPE_SECRET_KEY (sk_live_... in production, sk_test_... for
//      testing), STRIPE_WEBHOOK_SECRET (whsec_..., from the webhook
//      endpoint you add in Stripe's dashboard).

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: Stripe | null = null;

export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
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
