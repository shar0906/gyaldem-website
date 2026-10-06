// app/api/stripe/webhook/route.ts
//
// POST /api/stripe/webhook
// Stripe calls this; nothing else should. Every request's signature is
// checked against STRIPE_WEBHOOK_SECRET before anything is trusted.
//
// Handles:
//   checkout.session.completed / async_payment_succeeded -> order paid
//   checkout.session.expired   -> hold released
//   charge.refunded            -> order refunded once fully refunded
//                                 (refund in Stripe's dashboard)
// Every handler is safe to receive twice; Stripe retries on failure.
//
// Set up one endpoint in Sandbox and one in live mode, both pointing
// here with those four events. Their signing secrets go in
// STRIPE_WEBHOOK_SECRET_TEST and STRIPE_WEBHOOK_SECRET_LIVE; events from
// either are accepted, each checked against its own secret.

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { markOrderPaid, verifyWebhook, webhookSecrets } from "../../../lib/ln/stripe";

export async function POST(req: NextRequest) {
  if (!webhookSecrets().length) {
    console.error("Stripe webhook not configured: no STRIPE_WEBHOOK_SECRET_TEST/_LIVE");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();
  const event: Stripe.Event | null = signature ? verifyWebhook(payload, signature) : null;
  if (!event) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const db = serviceClient();
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await markOrderPaid(db, event.data.object);
        break;

      case "checkout.session.expired": {
        const orderId = event.data.object.metadata?.order_id;
        if (orderId) {
          const { error } = await db.from("ln_vip_orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
          if (error) throw error;
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (intent && charge.amount_refunded >= charge.amount) {
          const { error } = await db
            .from("ln_vip_orders")
            .update({ status: "refunded", refunded_at: new Date().toISOString() })
            .eq("stripe_payment_intent_id", intent)
            .eq("status", "paid");
          if (error) throw error;
        }
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry later, which is what we want here.
    console.error(`stripe webhook ${event.type} failed:`, error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
