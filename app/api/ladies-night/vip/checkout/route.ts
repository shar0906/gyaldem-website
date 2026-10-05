// app/api/ladies-night/vip/checkout/route.ts
//
// POST /api/ladies-night/vip/checkout
// Body: { quantity: 1-5 }
// Public, remembered guests who've RSVP'd. Holds the passes (cap, 5 per
// RSVP, 48-hour cutoff, all enforced in the database), then opens a
// Stripe Checkout page with their email filled in. The hold lasts as
// long as the checkout page does, then releases on its own if unpaid.
//
//   200 { url }   send the browser to this Stripe page
//   400 invalid_quantity
//   401 not_signed_in
//   409 rsvp_required | vip_disabled | vip_closed | sold_out | rsvp_limit
//   503 not_configured (Stripe keys missing)

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../../lib/admin/staff-auth";
import { readGuestId } from "../../../../lib/ln/guest-session";
import { getCurrentShow, publicArtist } from "../../../../lib/ln/public-show";
import { limited, tooMany } from "../../../../lib/ln/public-guard";
import { stripe } from "../../../../lib/ln/stripe";
import { siteUrl } from "../../../../lib/ln/tonight";

const RESERVE_ERRORS = ["vip_disabled", "vip_closed", "sold_out", "rsvp_limit", "invalid_quantity", "rsvp_not_found"];
// Stripe's minimum checkout lifetime is 30 minutes; a little extra
// covers the seconds between creating the hold and the page.
const CHECKOUT_MINUTES = 31;

export async function POST(req: NextRequest) {
  if (limited(req, "vip", 10)) return tooMany();

  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { quantity?: unknown } | null;
  const quantity = body?.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
  }

  const stripeClient = stripe();
  if (!stripeClient) {
    console.error("STRIPE_SECRET_KEY is missing");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const db = serviceClient();
  try {
    const show = await getCurrentShow(db);
    if (!show) return NextResponse.json({ error: "vip_disabled" }, { status: 409 });

    const [{ data: voter, error: voterError }, { data: rsvp, error: rsvpError }] = await Promise.all([
      db.from("ln_voters").select("email").eq("id", voterId).maybeSingle(),
      db.from("ln_rsvps").select("id").eq("event_id", show.id).eq("voter_id", voterId).maybeSingle(),
    ]);
    if (voterError || rsvpError) throw voterError ?? rsvpError;
    if (!voter) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    if (!rsvp) return NextResponse.json({ error: "rsvp_required" }, { status: 409 });

    const { data: orderId, error: reserveError } = await db.rpc("ln_reserve_vip", {
      p_rsvp: rsvp.id,
      p_quantity: quantity,
    });
    if (reserveError) {
      const known = RESERVE_ERRORS.find((k) => reserveError.message?.includes(k));
      if (known) {
        const code = known === "rsvp_not_found" ? "rsvp_required" : known;
        return NextResponse.json({ error: code }, { status: code === "invalid_quantity" ? 400 : 409 });
      }
      throw reserveError;
    }

    const artist = await publicArtist(db, show.artist_id);
    const expiresAt = Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60;
    const site = siteUrl();

    let session;
    try {
      session = await stripeClient.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: voter.email,
          client_reference_id: orderId as string,
          expires_at: expiresAt,
          line_items: [
            {
              quantity,
              price_data: {
                currency: "usd",
                unit_amount: show.vip_price_cents,
                product_data: {
                  name: `VIP: ${show.title}${artist ? ` with ${artist.display_name}` : ""}`,
                  ...(show.vip_perks ? { description: show.vip_perks } : {}),
                },
              },
            },
          ],
          metadata: { order_id: orderId as string, event_id: show.id, rsvp_id: rsvp.id },
          payment_intent_data: { metadata: { order_id: orderId as string, event_id: show.id } },
          success_url: `${site}/ladies-night?vip=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${site}/ladies-night?vip=cancelled`,
        },
        { idempotencyKey: `vip-order-${orderId}` }
      );
    } catch (stripeError) {
      // Release the hold right away instead of waiting out the 30 minutes.
      await db.from("ln_vip_orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
      throw stripeError;
    }

    const { error: saveError } = await db
      .from("ln_vip_orders")
      .update({ stripe_checkout_session_id: session.id, expires_at: new Date(expiresAt * 1000).toISOString() })
      .eq("id", orderId);
    if (saveError) console.error("saving checkout session id failed (webhook still uses order_id):", saveError);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("vip checkout failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
