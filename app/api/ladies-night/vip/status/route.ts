// app/api/ladies-night/vip/status/route.ts
//
// GET /api/ladies-night/vip/status?session_id=cs_...
// Public. Where Stripe sends the guest back after paying. Usually the
// webhook has already confirmed the payment; if it hasn't arrived yet,
// this asks Stripe directly so the guest sees their VIP right away.
// Only the guest who bought it can check it.
//
//   200 { status: "paid" | "pending" | "expired" | "refunded", quantity }

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../../lib/admin/staff-auth";
import { readGuestId } from "../../../../lib/ln/guest-session";
import { markOrderPaid, stripeForSession } from "../../../../lib/ln/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const voterId = readGuestId(req);
  if (!voterId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = serviceClient();
  try {
    const { data: order, error } = await db
      .from("ln_vip_orders")
      .select("id, status, quantity, ln_rsvps!inner(voter_id)")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle<{ id: string; status: string; quantity: number; ln_rsvps: { voter_id: string } }>();
    if (error) throw error;
    if (!order || order.ln_rsvps.voter_id !== voterId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (order.status === "pending") {
      const client = stripeForSession(sessionId);
      if (client) {
        const session = await client.checkout.sessions.retrieve(sessionId);
        if (await markOrderPaid(db, session)) {
          return NextResponse.json({ status: "paid", quantity: order.quantity });
        }
      }
    }
    return NextResponse.json({ status: order.status, quantity: order.quantity });
  } catch (error) {
    console.error("vip status failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
