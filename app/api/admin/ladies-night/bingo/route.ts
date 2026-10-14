// app/api/admin/ladies-night/bingo/route.ts
//
// The host console for tonight's show (going live, posts, and the bingo
// caller). Admin or host logins; a host limited to one series only sees
// that series' show. Each host phone sends a device id it keeps in its
// own storage, so the server knows which phone is holding the mic.
//
// GET ?show=<id>&device=<id> -> { show, shows, live, bingo }
//   Host phones refresh this every couple of seconds. shows lists
//   tonight's shows this login can pick from.
//
// POST { show_id?, action, device, last_seen, winner? }
//   draw       pull the next line; only the host sees it until it's called
//              (the first phone to draw becomes the caller)
//   call       mark the drawn line called: guests see it after the
//              series' delay (5 seconds by default)
//   undo       remove the latest line, until guests have seen it
//   bingo      end the round; winner (optional) posts "Round 2: Tasha!"
//              to the live page
//   new_round  start the next round (3 per night) with this phone calling
//   take_over  this phone becomes the caller
//   last_seen is the draw number the phone is showing. If another draw
//   happened since, the action is refused with "stale" so a double tap or
//   a second phone can never advance the game twice.
//
//   200 { ...state, exhausted? }    exhausted: every line has been called
//   409 not_caller | stale | round_ended | round_open | no_round
//       call_pending (call the drawn line first) | already_live (guests
//       have seen it) | rounds_done | no_deck | no_show_tonight

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { DEVICE_ID, ROUNDS_PER_NIGHT, bingoState } from "../../../../lib/ln/bingo";
import { hostShow } from "../../../../lib/ln/staff-show";
import { hostState } from "../../../../lib/ln/host-state";

export const dynamic = "force-dynamic";

const ACTIONS = ["draw", "call", "undo", "bingo", "new_round", "take_over"] as const;
type Action = (typeof ACTIONS)[number];
const CONFLICTS = ["not_caller", "stale", "round_ended", "round_not_found", "call_pending", "already_live", "no_deck"];

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const device = req.nextUrl.searchParams.get("device");
  const db = serviceClient();
  try {
    const { current, options, today } = await hostShow(db, user, req.nextUrl.searchParams.get("show"));
    if (!current) return NextResponse.json({ show: null, shows: [] }, { headers: { "Cache-Control": "no-store" } });
    const state = await hostState(db, current, device && DEVICE_ID.test(device) ? device : null);
    return NextResponse.json({ ...state, show: state.show && { ...state.show, show_day: today }, shows: options }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("host state failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { show_id?: unknown; action?: unknown; device?: unknown; last_seen?: unknown; winner?: unknown }
    | null;
  const action = ACTIONS.find((a) => a === body?.action) as Action | undefined;
  const device = typeof body?.device === "string" && DEVICE_ID.test(body.device) ? body.device : null;
  const lastSeen = typeof body?.last_seen === "number" && Number.isInteger(body.last_seen) ? body.last_seen : null;
  if (!action || !device) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const winner = typeof body?.winner === "string" ? body.winner.trim().slice(0, 60) : "";

  const db = serviceClient();
  try {
    const { current: tonight, options, today } = await hostShow(db, user, body?.show_id);
    if (!tonight) return NextResponse.json({ error: "no_show_tonight" }, { status: 409 });
    if (!today) return NextResponse.json({ error: "not_show_day", message: "Bingo opens on show day." }, { status: 409 });
    const { show, series } = tonight;
    if (!show.bingo_deck_id) return NextResponse.json({ error: "no_deck" }, { status: 409 });

    const current = await bingoState(db, show, device, series.call_delay_seconds);
    const round = current.round;
    let exhausted = false;

    if (action === "new_round") {
      if (round && !round.ended) return NextResponse.json({ error: "round_open" }, { status: 409 });
      if ((round?.number ?? 0) >= ROUNDS_PER_NIGHT) return NextResponse.json({ error: "rounds_done" }, { status: 409 });
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
        roundId = data?.id ?? (await bingoState(db, show, device, series.call_delay_seconds)).round?.id;
      }
      if (lastSeen === null) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const { data, error } = await db.rpc("ln_bingo_draw_v2", {
        p_round: roundId,
        p_host: user.email,
        p_device: device,
        p_last_seen: lastSeen,
      });
      if (error) throw error;
      exhausted = !data || (Array.isArray(data) && data.length === 0);
    } else if (action === "call") {
      if (!round) return NextResponse.json({ error: "no_round" }, { status: 409 });
      if (lastSeen === null) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const { error } = await db.rpc("ln_bingo_call", { p_round: round.id, p_device: device, p_last_seen: lastSeen });
      if (error) throw error;
    } else if (action === "undo") {
      if (!round) return NextResponse.json({ error: "no_round" }, { status: 409 });
      if (lastSeen === null) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const { error } = await db.rpc("ln_bingo_undo_v2", {
        p_round: round.id,
        p_device: device,
        p_last_seen: lastSeen,
        p_grace_seconds: series.call_delay_seconds,
      });
      if (error) throw error;
    } else if (action === "bingo") {
      if (!round) return NextResponse.json({ error: "no_round" }, { status: 409 });
      if (round.ended) return NextResponse.json({ error: "round_ended" }, { status: 409 });
      if (!round.caller?.is_you) return NextResponse.json({ error: "not_caller" }, { status: 409 });
      const { data: ended, error } = await db
        .from("ln_bingo_rounds")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", round.id)
        .is("ended_at", null)
        .select("id");
      if (error) throw error;
      if (ended?.length) {
        const body =
          winner
            ? `Round ${round.number} goes to ${winner}!`
            : `We have a winner for round ${round.number}!`;
        const { error: postError } = await db
          .from("ln_live_posts")
          .insert({ event_id: show.id, kind: "winner", body, round_number: round.number, created_by: user.email });
        if (postError) console.error("winner post failed (round still ended):", postError);
      }
    } else if (action === "take_over") {
      if (!round || round.ended) return NextResponse.json({ error: "no_round" }, { status: 409 });
      const { error } = await db
        .from("ln_bingo_rounds")
        .update({ caller_device_id: device, caller_email: user.email, caller_since: new Date().toISOString() })
        .eq("id", round.id)
        .is("ended_at", null);
      if (error) throw error;
    }

    const fresh = await hostShow(db, user, show.id);
    const state = await hostState(db, fresh.current ?? tonight, device);
    return NextResponse.json({ ...state, show: state.show && { ...state.show, show_day: true }, shows: options, exhausted });
  } catch (error) {
    const message = (error as { message?: string })?.message ?? "";
    const conflict = CONFLICTS.find((c) => message.includes(c));
    if (conflict) return NextResponse.json({ error: conflict === "round_not_found" ? "no_round" : conflict }, { status: 409 });
    console.error("bingo action failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
