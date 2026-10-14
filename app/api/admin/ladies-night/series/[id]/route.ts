// app/api/admin/ladies-night/series/[id]/route.ts
//
// PATCH -> edit a series (any subset of its settings, images included).
// Admin-only. Changes show on the series page right away. Changing the
// link (slug) updates every show's Events-page RSVP link.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { SERIES_COLUMNS, SeriesRow, parseSeriesPatch } from "../../../../../lib/ln/series";
import { SHOW_COLUMNS, ShowRow, syncPublicEvent } from "../../../../../lib/ln/shows";
import { todayEastern } from "../../../../../lib/ln/dates";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const parsed = parseSeriesPatch(body, id);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });

  const db = serviceClient();
  const { data: series, error } = await db
    .from("ln_series")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SERIES_COLUMNS)
    .maybeSingle<SeriesRow>();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "invalid", field: "slug", message: "Another series already uses that link." }, { status: 400 });
    console.error("series update failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!series) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if ("slug" in parsed.value) {
    const { data: shows } = await db
      .from("ln_events")
      .select(SHOW_COLUMNS)
      .eq("series_id", id)
      .gte("event_date", todayEastern())
      .returns<ShowRow[]>();
    for (const s of shows ?? []) await syncPublicEvent(db, s);
  }
  return NextResponse.json({ success: true, series });
}
