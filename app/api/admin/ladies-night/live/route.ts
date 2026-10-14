// app/api/admin/ladies-night/live/route.ts
//
// POST: the host console's live controls for tonight's show. Admin or
// host logins; a host limited to one series only reaches that series.
// Every change shows on the live page within a few seconds.
//
// Body: { show_id?, action, ... }
//   go_live                        guests' pages switch to the live view
//   wrap                           the night is over: the live page
//                                  becomes the recap
//   reopen                         undo wrap (back to live)
//   announce { body }              post an announcement (280 characters)
//   delete_post { post_id }        take a post down
//   running_order { items: [{ label, time? }] }   up to 20 items
//   now { index | null }           highlight what's on now
//
//   200 { success: true }
//   400 invalid { message }
//   409 no_show_tonight | not_live

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { hostShow, readShowId } from "../../../../lib/ln/staff-show";
import { parseRunningOrder } from "../../../../lib/ln/show-rules";
import { runningOrder } from "../../../../lib/ln/live";

const ACTIONS = ["go_live", "wrap", "reopen", "announce", "delete_post", "running_order", "now"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = ACTIONS.find((a) => a === body?.action) as Action | undefined;
  if (!body || !action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  try {
    const { current, today } = await hostShow(db, user, body.show_id);
    if (!current) return NextResponse.json({ error: "no_show_tonight" }, { status: 409 });
    // Admins can prep an upcoming show; going live waits for show day.
    if (!today && (action === "go_live" || action === "wrap" || action === "reopen")) {
      return NextResponse.json({ error: "not_show_day", message: "You can go live on show day." }, { status: 409 });
    }
    const { show } = current;
    const update = (fields: Record<string, unknown>) => db.from("ln_events").update(fields).eq("id", show.id);
    const now = new Date().toISOString();

    if (action === "go_live") {
      if (show.has_bingo && !show.bingo_deck_id) {
        return NextResponse.json(
          { error: "no_deck", message: "This show is set for bingo but has no deck yet. Ask an admin to pick one in Shows." },
          { status: 409 }
        );
      }
      const { error } = await update({ live_started_at: show.live_started_at ?? now, live_ended_at: null });
      if (error) throw error;
    } else if (action === "wrap") {
      if (!show.live_started_at) return NextResponse.json({ error: "not_live" }, { status: 409 });
      const { error } = await update({ live_ended_at: now });
      if (error) throw error;
    } else if (action === "reopen") {
      const { error } = await update({ live_ended_at: null, live_started_at: show.live_started_at ?? now });
      if (error) throw error;
    } else if (action === "announce") {
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!text || text.length > 280) {
        return NextResponse.json({ error: "invalid", message: "Keep announcements between 1 and 280 characters." }, { status: 400 });
      }
      const { error } = await db.from("ln_live_posts").insert({ event_id: show.id, kind: "announcement", body: text, created_by: user.email });
      if (error) throw error;
    } else if (action === "delete_post") {
      const postId = readShowId(body.post_id);
      if (!postId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      const { error } = await db.from("ln_live_posts").update({ deleted_at: now }).eq("id", postId).eq("event_id", show.id);
      if (error) throw error;
    } else if (action === "running_order") {
      const items = parseRunningOrder(body.items);
      if (typeof items === "string") return NextResponse.json({ error: "invalid", message: items }, { status: 400 });
      const runNow = show.run_now !== null && show.run_now < items.length ? show.run_now : null;
      const { error } = await update({ running_order: items, run_now: runNow });
      if (error) throw error;
    } else if (action === "now") {
      const items = runningOrder(show, current.series);
      const index = body.index;
      if (index !== null && (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= items.length)) {
        return NextResponse.json({ error: "invalid", message: "Pick an item from the running order." }, { status: 400 });
      }
      // Marking an item on the series' master run of show saves it to the
      // show, so the two stay in step if the master changes later.
      const own = Array.isArray(show.running_order) && show.running_order.length > 0;
      const { error } = await update(own ? { run_now: index } : { run_now: index, running_order: items });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("live control failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
