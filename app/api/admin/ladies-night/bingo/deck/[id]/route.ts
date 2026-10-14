// app/api/admin/ladies-night/bingo/deck/[id]/route.ts
//
// One deck line. Admin-only.
// PATCH  { line?, song?, artist?, active? }   edit, or switch on/off
// DELETE                                     remove it. Lines that have
//   already been called in a round can't be deleted (that would rewrite
//   the round's history); switch them off instead.
//
//   200 { success: true, entry }
//   400 { error: "invalid", message }
//   404 not_found
//   409 duplicate_line | in_use

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../../lib/admin/staff-auth";
import { cleanDeckEntry } from "../../../../../../lib/ln/bingo-entries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  const { data: current, error: findError } = await db
    .from("ln_bingo_entries")
    .select("id, line, song, artist, ln_bingo_decks(kind)")
    .eq("id", id)
    .maybeSingle<{ id: string; line: string; song: string | null; artist: string | null; ln_bingo_decks: { kind: "match" | "callout_answer" } | null }>();
  if (findError) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if ("line" in body || "song" in body || "artist" in body) {
    const merged = {
      line: "line" in body ? body.line : current.line,
      song: "song" in body ? body.song : current.song,
      artist: "artist" in body ? body.artist : current.artist,
    };
    const cleaned = cleanDeckEntry(merged, current.ln_bingo_decks?.kind ?? "callout_answer");
    if (typeof cleaned === "string") return NextResponse.json({ error: "invalid", message: cleaned }, { status: 400 });
    Object.assign(update, cleaned);
  }
  if ("active" in body) {
    if (typeof body.active !== "boolean") return NextResponse.json({ error: "invalid", message: "Invalid on/off value." }, { status: 400 });
    update.active = body.active;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const { data, error } = await db
    .from("ln_bingo_entries")
    .update(update)
    .eq("id", id)
    .select("id, line, song, artist, active, sort_order")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "duplicate_line" }, { status: 409 });
    console.error("deck update failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ success: true, entry: data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;

  const { data, error } = await serviceClient().from("ln_bingo_entries").delete().eq("id", id).select("id");
  if (error) {
    if (error.code === "23503") return NextResponse.json({ error: "in_use" }, { status: 409 });
    console.error("deck delete failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
