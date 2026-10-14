// app/api/admin/ladies-night/bingo/decks/[id]/route.ts
//
// One bingo deck. Admin-only.
//
// GET                          -> { deck, entries }   in list order
// GET ?format=csv              -> the deck as a spreadsheet
// GET ?format=canva&cards=60   -> printable cards for Canva Bulk Create
//                                 (card_no, r1c1..r5c5 without the center,
//                                 theme). Up to 300 cards.
// PATCH { name?, kind?, card_face?, active? }
//
//   400 not_enough (a card needs 24 different squares)

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { csvResponse, toCsv } from "../../../../../../lib/ln/csv";
import { CardFace, DeckKind, cardText } from "../../../../../../lib/ln/bingo";
import { MAX_CARDS, SQUARES, buildCards, cardsCsv, distinctTexts } from "../../../../../../lib/ln/bingo-cards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
type Entry = { id: string; line: string; song: string | null; artist: string | null; active: boolean; sort_order: number };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const db = serviceClient();
  const [deckRes, entriesRes] = await Promise.all([
    db.from("ln_bingo_decks").select("id, name, kind, card_face, active").eq("id", id).maybeSingle(),
    db
      .from("ln_bingo_entries")
      .select("id, line, song, artist, active, sort_order")
      .eq("deck_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Entry[]>(),
  ]);
  if (deckRes.error || entriesRes.error) {
    console.error("deck read failed:", deckRes.error ?? entriesRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const deck = deckRes.data as { id: string; name: string; kind: DeckKind; card_face: CardFace; active: boolean } | null;
  if (!deck) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const entries = entriesRes.data ?? [];
  const active = entries.filter((e) => e.active);
  const faces = distinctTexts(active.map((e) => cardText(e, deck.kind, deck.card_face)));
  const fileBase = deck.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deck";

  const format = req.nextUrl.searchParams.get("format");
  if (format === "csv") {
    return csvResponse(
      `${fileBase}-deck.csv`,
      deck.kind === "match"
        ? toCsv(["line", "active"], entries.map((e) => [e.line, e.active ? "yes" : "no"]))
        : toCsv(["callout", "song", "artist", "active"], entries.map((e) => [e.line, e.song, e.artist, e.active ? "yes" : "no"]))
    );
  }
  if (format === "canva") {
    const n = Number.parseInt(req.nextUrl.searchParams.get("cards") ?? "", 10);
    if (!Number.isInteger(n) || n < 1 || n > MAX_CARDS) {
      return NextResponse.json({ error: "invalid", message: `Make between 1 and ${MAX_CARDS} cards at a time.` }, { status: 400 });
    }
    if (faces.length < SQUARES) {
      return NextResponse.json({ error: "not_enough", have: faces.length, need: SQUARES }, { status: 400 });
    }
    return csvResponse(`${fileBase}-cards.csv`, cardsCsv(buildCards(faces, n), deck.name));
  }

  return NextResponse.json({
    deck: { ...deck, lines: active.length, card_squares: faces.length, enough_for_cards: faces.length >= SQUARES },
    entries,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const update: Record<string, unknown> = {};
  if ("name" in body) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v || v.length > 80) return NextResponse.json({ error: "invalid", field: "name", message: "Name the deck (80 characters max)." }, { status: 400 });
    update.name = v;
  }
  if ("kind" in body) {
    if (body.kind !== "match" && body.kind !== "callout_answer") return NextResponse.json({ error: "invalid", field: "kind", message: "Pick the deck type." }, { status: 400 });
    update.kind = body.kind;
  }
  if ("card_face" in body) {
    if (body.card_face !== "answer" && body.card_face !== "artist") return NextResponse.json({ error: "invalid", field: "card_face", message: "Pick what goes on the card." }, { status: 400 });
    update.card_face = body.card_face;
  }
  if ("active" in body) {
    if (typeof body.active !== "boolean") return NextResponse.json({ error: "invalid", message: "Invalid on/off value." }, { status: 400 });
    update.active = body.active;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const { data, error } = await serviceClient()
    .from("ln_bingo_decks")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, kind, card_face, active")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "invalid", field: "name", message: "There's already a deck with that name." }, { status: 400 });
    console.error("deck update failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ success: true, deck: data });
}
