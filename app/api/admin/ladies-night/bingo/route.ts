// app/api/admin/ladies-night/bingo/route.ts
//
// The bingo caller for tonight's show. Admin or host logins.
// Each host phone sends a device id it keeps in its own storage, so the
// server knows which phone is holding the mic.
//
// GET ?device=<id> -> { show, round, draws, last_order, deck_size }
//   Host phones refresh this every couple of seconds.
//
// POST { action, device, last_seen }
//   draw       pull the next line (the first phone to draw becomes caller)
//   undo       remove the latest line (caller only)
//   bingo      end the round: drawing locks until a new round
//   new_round  start the next round with this phone as caller
//   take_over  this phone becomes the caller
//   last_seen is the draw number the phone is showing. If another draw
//   happened since, the action is refused with "stale" so a double tap or
//   a second phone can never advance the game twice.
//
//   200 { ...state, exhausted? }    exhausted: every line has been called
//   409 not_caller | stale | round_ended | round_open | no_round
//   409 no_show_tonight

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { getTonightShow } from "../../../../lib/ln/tonight";
import { DEVICE_ID, bingoState } from "../../../../lib/ln/bingo";

export const dynamic = "force-dynamic";

const ACTIONS = ["draw", "undo", "bingo", "new_round", "take_over"] as const;
type Action = (typeof ACTIONS)[number];
const CONFLICTS = ["not_caller", "stale", "round_ended", "round_not_found"];

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const device = req.nextUrl.searchParams.get("device");
  const db = serviceClient();
  try {
    const show = await getTonightShow(db);
    if (!show) return NextResponse.json({ show: null }, { headers: { "Cache-Control": "no-store" } });
    const state = await bingoState(db, show.id, device && DEVICE_ID.test(device) ? device : null);
    return NextResponse.json(
      { show: { id: show.id, title: show.title, event_date: show.event_date }, ...state },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("bingo state failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { action?: unknown; device?: unknown; last_seen?: unknown } | null;
  const action = ACTIONS.find((a) => a === body?.action) as Action | undefined;
  const device = typeof body?.device === "string" && DEVICE_ID.test(body.device) ? body.device : null;
  const lastSeen = typeof body?.last_seen === "number" && Number.isInteger(body.last_seen) ? body.last_seen : null;
  if (!action || !device) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  try {
    const show = await getTonightShow(db);
    if (!show) return NextResponse.json({ error: "no_show_tonight" }, { status: 409 });

    const current = await bingoState(db, show.id, device);
    const round = current.round;
    let exhausted = false;

    if (action === "new_round") {
      if (round && !round.ended) return NextResponse.json({ error: "round_open" }, { status: 409 });
      const { error } = await db.from("ln_bingo_rounds").insert({
        event_id: show.id,
        round_number: (round?.number ?? 0) + 1,
        started_by: user.email,
        caller_device_id: device,
        caller_email: user.email,
        caller_since: new Date().toISOString(),
      });
      // 23505: another phone started the same round a moment earlier.
      if (error && error.code !== "23505") throw error;
    } else if (action === "draw") {
      let roundId = round?.id;
      if (!round) {
        // First draw of the night starts round 1 with this phone as caller.
        const { data, error } = await db
          .from("ln_bingo_rounds")
          .insert({ event_id: show.id, round_number: 1, started_by: user.email })
          .select("id")
          .single();
        if (error && error.code !== "23505") throw error;
        roundId = data?.id ?? (await bingoState(db, show.id, device)).round?.id;
      }
      if (lastSeen === null) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const { data, error } = await db.rpc("ln_bingo_draw_checked", {
        p_round: roundId,
        p_host: user.email,
        p_device: device,
        p_last_seen: lastSeen,
      });
      if (error) throw error;
      exhausted = !data || (Array.isArray(data) && data.length === 0);
    } else if (action === "undo") {
      if (!round) return NextResponse.json({ error: "no_round" }, { status: 409 });
      if (lastSeen === null) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const { error } = await db.rpc("ln_bingo_undo", { p_round: round.id, p_device: device, p_last_seen: lastSeen });
      if (error) throw error;
    } else if (action === "bingo") {
      if (!round) return NextResponse.json({ error: "no_round" }, { status: 409 });
      if (round.ended) return NextResponse.json({ error: "round_ended" }, { status: 409 });
      if (!round.caller?.is_you) return NextResponse.json({ error: "not_caller" }, { status: 409 });
      const { error } = await db
        .from("ln_bingo_rounds")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", round.id)
        .is("ended_at", null);
      if (error) throw error;
    } else if (action === "take_over") {
      if (!round || round.ended) return NextResponse.json({ error: "no_round" }, { status: 409 });
      const { error } = await db
        .from("ln_bingo_rounds")
        .update({ caller_device_id: device, caller_email: user.email, caller_since: new Date().toISOString() })
        .eq("id", round.id)
        .is("ended_at", null);
      if (error) throw error;
    }

    const state = await bingoState(db, show.id, device);
    return NextResponse.json({ show: { id: show.id, title: show.title, event_date: show.event_date }, ...state, exhausted });
  } catch (error) {
    const message = (error as { message?: string })?.message ?? "";
    const conflict = CONFLICTS.find((c) => message.includes(c));
    if (conflict) return NextResponse.json({ error: conflict === "round_not_found" ? "no_round" : conflict }, { status: 409 });
    console.error("bingo action failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
