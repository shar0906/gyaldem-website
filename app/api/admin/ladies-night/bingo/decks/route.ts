// app/api/admin/ladies-night/bingo/decks/route.ts
//
// Admin-only. The bingo deck library: themed decks any series can use.
//   match           the line is read and printed as is ("Say Less")
//   callout_answer  the line is read; the answer (song by artist) is on
//                   the card. card_face: "answer" prints the full answer,
//                   "artist" prints just the artist.
//
// GET  -> { decks }   each with its line count and upcoming shows using it
// POST -> create { name, kind, card_face? }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { todayEastern } from "../../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

const DECK_COLUMNS = "id, name, kind, card_face, active, created_at";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = serviceClient();
  const [decksRes, entriesRes, showsRes] = await Promise.all([
    db.from("ln_bingo_decks").select(DECK_COLUMNS).order("name"),
    db.from("ln_bingo_entries").select("deck_id, active"),
    db.from("ln_events").select("bingo_deck_id").eq("archived", false).gte("event_date", todayEastern()).not("bingo_deck_id", "is", null),
  ]);
  if (decksRes.error || entriesRes.error || showsRes.error) {
    console.error("decks list failed:", decksRes.error ?? entriesRes.error ?? showsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const lines = new Map<string, number>();
  for (const e of entriesRes.data ?? []) if (e.active) lines.set(e.deck_id, (lines.get(e.deck_id) ?? 0) + 1);
  const shows = new Map<string, number>();
  for (const s of showsRes.data ?? []) if (s.bingo_deck_id) shows.set(s.bingo_deck_id, (shows.get(s.bingo_deck_id) ?? 0) + 1);
  return NextResponse.json({
    decks: (decksRes.data ?? []).map((d) => ({ ...d, lines: lines.get(d.id) ?? 0, upcoming_shows: shows.get(d.id) ?? 0 })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { name?: unknown; kind?: unknown; card_face?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kind = body?.kind === "match" || body?.kind === "callout_answer" ? body.kind : null;
  const cardFace = body?.card_face === "artist" ? "artist" : "answer";
  if (!name || name.length > 80) return NextResponse.json({ error: "invalid", field: "name", message: "Name the deck (80 characters max)." }, { status: 400 });
  if (!kind) return NextResponse.json({ error: "invalid", field: "kind", message: "Pick the deck type." }, { status: 400 });
  const { data, error } = await serviceClient()
    .from("ln_bingo_decks")
    .insert({ name, kind, card_face: cardFace })
    .select(DECK_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "invalid", field: "name", message: "There's already a deck with that name." }, { status: 400 });
    console.error("deck create failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true, deck: { ...data, lines: 0, upcoming_shows: 0 } });
}
