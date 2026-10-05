// app/api/admin/ladies-night/bingo/deck/route.ts
//
// The bingo deck: lines read aloud, the song, and the artist (the answer
// printed on the cards). One shared deck across shows. Admin-only.
//
// GET                         -> { entries, stats }
// GET ?format=csv             -> the whole deck as CSV (line, song, artist, active)
// GET ?format=csv&list=artists -> active artists, one per row, for whoever
//                                 prints the cards
//
// POST -> add entries
//   { entries: [{ line, song, artist }, ...] }   from a form
//   { csv: "line,song,artist\n..." }              from a spreadsheet
//   Columns: line, song, artist. A header row is fine. Up to 500 rows.
//   Lines already in the deck are skipped, not duplicated.
//   200 { added, skipped, invalid: [{ row, reason }] }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { csvResponse, toCsv } from "../../../../../lib/ln/csv";
import { parseCsv } from "../../../../../lib/ln/csv-parse";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;
type Entry = { line: string; song: string; artist: string };

function clean(raw: { line?: unknown; song?: unknown; artist?: unknown }): Entry | string {
  const line = typeof raw.line === "string" ? raw.line.trim() : "";
  const song = typeof raw.song === "string" ? raw.song.trim() : "";
  const artist = typeof raw.artist === "string" ? raw.artist.trim() : "";
  if (!line || !song || !artist) return "Needs a line, song, and artist.";
  if (line.length > 300) return "Line is over 300 characters.";
  if (song.length > 200 || artist.length > 120) return "Song or artist is too long.";
  return { line, song, artist };
}

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const { data, error } = await serviceClient()
    .from("ln_bingo_entries")
    .select("id, line, song, artist, active, created_at")
    .order("artist", { ascending: true })
    .order("song", { ascending: true });
  if (error) {
    console.error("deck list failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const entries = data ?? [];
  const active = entries.filter((e) => e.active);
  const artists = [...new Set(active.map((e) => e.artist))].sort((a, b) => a.localeCompare(b));

  const params = req.nextUrl.searchParams;
  if (params.get("format") === "csv") {
    if (params.get("list") === "artists") {
      return csvResponse("bingo-card-artists.csv", toCsv(["Artist"], artists.map((a) => [a])));
    }
    return csvResponse(
      "bingo-deck.csv",
      toCsv(["line", "song", "artist", "active"], entries.map((e) => [e.line, e.song, e.artist, e.active ? "yes" : "no"]))
    );
  }

  return NextResponse.json({
    entries,
    stats: {
      total: entries.length,
      active: active.length,
      artists: artists.length,
      // A 5x5 card with a free center needs 24 different artists.
      enough_for_cards: artists.length >= 24,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { entries?: unknown; csv?: unknown } | null;
  let raws: { line?: unknown; song?: unknown; artist?: unknown }[] = [];
  let firstRowNumber = 1;

  if (typeof body?.csv === "string") {
    const rows = parseCsv(body.csv);
    if (rows.length && /^\s*line\s*$/i.test(rows[0][0] ?? "")) {
      rows.shift();
      firstRowNumber = 2;
    }
    raws = rows.map((r) => ({ line: r[0], song: r[1], artist: r[2] }));
  } else if (Array.isArray(body?.entries)) {
    raws = body.entries as typeof raws;
  } else {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (raws.length > MAX_ROWS) {
    return NextResponse.json({ error: "too_many_rows", max: MAX_ROWS }, { status: 400 });
  }

  const invalid: { row: number; reason: string }[] = [];
  const valid: Entry[] = [];
  raws.forEach((r, i) => {
    const result = clean(r ?? {});
    if (typeof result === "string") invalid.push({ row: i + firstRowNumber, reason: result });
    else valid.push(result);
  });

  const db = serviceClient();
  const { data: existing, error: existingError } = await db.from("ln_bingo_entries").select("line");
  if (existingError) {
    console.error("deck lookup failed:", existingError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const seen = new Set((existing ?? []).map((e) => (e.line as string).trim().toLowerCase()));
  const toAdd = valid.filter((e) => {
    const key = e.line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (toAdd.length) {
    const { error } = await db
      .from("ln_bingo_entries")
      .insert(toAdd.map((e) => ({ ...e, created_by: user.email })));
    if (error) {
      console.error("deck insert failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ added: toAdd.length, skipped: valid.length - toAdd.length, invalid });
}
