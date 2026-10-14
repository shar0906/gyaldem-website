// app/api/admin/ladies-night/bingo/deck/route.ts
//
// Adds lines to a bingo deck. Admin-only.
//
// POST { deck_id, ... } one of:
//   { entries: [{ line, song?, artist? }] }   from the form
//   { text: "1. Lover Girl\n2. Real Bad..." }  pasted list (Match decks):
//                                              one line each, numbering
//                                              like "12." is removed
//   { csv: "..." }                             spreadsheet
//       Match decks: one column (line)
//       Callout -> Answer decks: callout, song, artist
//       A header row is fine. Up to 500 rows.
// Lines already in the deck are skipped, not duplicated. New lines go to
// the end of the list.
//   200 { added, skipped, invalid: [{ row, reason }] }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { parseCsv } from "../../../../../lib/ln/csv-parse";
import { cleanDeckEntry, DeckEntryInput, stripNumbering } from "../../../../../lib/ln/bingo-entries";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { deck_id?: unknown; entries?: unknown; csv?: unknown; text?: unknown } | null;
  const deckId = typeof body?.deck_id === "string" ? body.deck_id : null;
  if (!deckId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  const { data: deck, error: deckError } = await db.from("ln_bingo_decks").select("id, kind").eq("id", deckId).maybeSingle();
  if (deckError) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!deck) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const kind = deck.kind as "match" | "callout_answer";

  let raws: DeckEntryInput[] = [];
  let firstRowNumber = 1;
  if (typeof body?.csv === "string") {
    const rows = parseCsv(body.csv);
    if (rows.length && /^\s*(line|callout|phrase)\s*$/i.test(rows[0][0] ?? "")) {
      rows.shift();
      firstRowNumber = 2;
    }
    raws = rows.map((r) => (kind === "match" ? { line: stripNumbering(r[0] ?? "") } : { line: r[0], song: r[1], artist: r[2] }));
  } else if (typeof body?.text === "string") {
    raws = body.text
      .split(/\r?\n/)
      .map((l) => stripNumbering(l))
      .filter(Boolean)
      .map((line) => ({ line }));
  } else if (Array.isArray(body?.entries)) {
    raws = body.entries as DeckEntryInput[];
  } else {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (raws.length > MAX_ROWS) return NextResponse.json({ error: "too_many_rows", max: MAX_ROWS }, { status: 400 });

  const invalid: { row: number; reason: string }[] = [];
  const valid: { line: string; song: string | null; artist: string | null }[] = [];
  raws.forEach((r, i) => {
    const result = cleanDeckEntry(r ?? {}, kind);
    if (typeof result === "string") invalid.push({ row: i + firstRowNumber, reason: result });
    else valid.push(result);
  });

  const { data: existing, error: existingError } = await db.from("ln_bingo_entries").select("line, sort_order").eq("deck_id", deckId);
  if (existingError) {
    console.error("deck lookup failed:", existingError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const seen = new Set((existing ?? []).map((e) => (e.line as string).trim().toLowerCase()));
  let order = (existing ?? []).reduce((m, e) => Math.max(m, e.sort_order as number), 0);
  const toAdd = valid.filter((e) => {
    const key = e.line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (toAdd.length) {
    const { error } = await db
      .from("ln_bingo_entries")
      .insert(toAdd.map((e) => ({ ...e, deck_id: deckId, sort_order: ++order, created_by: user.email })));
    if (error) {
      console.error("deck insert failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ added: toAdd.length, skipped: valid.length - toAdd.length, invalid });
}
