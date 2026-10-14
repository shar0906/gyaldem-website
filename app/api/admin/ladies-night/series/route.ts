// app/api/admin/ladies-night/series/route.ts
//
// Admin-only. Series: the recurring nights (An Ode To Her, Please! A
// Ladies Night), each with its own page at /ladies-night/<slug>.
// GET  -> { series, clients }   series in display order, each with its
//         upcoming show count; clients for the picker
// POST -> create { name, slug, client_id?, default_venue_id?, colors,
//         tagline?, schedule_note?, feat_*?, call_delay_seconds? }
//         (upload logos and the cover after creating)

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { CLIENT_COLUMNS, ClientRow, SERIES_COLUMNS, SeriesRow, SERIES_LOGO_FIELDS, parseSeriesPatch } from "../../../../lib/ln/series";
import { todayEastern } from "../../../../lib/ln/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = serviceClient();
  const [seriesRes, clientsRes, showsRes] = await Promise.all([
    db.from("ln_series").select(SERIES_COLUMNS).order("sort_order", { ascending: true }).order("name").returns<SeriesRow[]>(),
    db.from("ln_clients").select(CLIENT_COLUMNS).order("name").returns<ClientRow[]>(),
    db.from("ln_events").select("series_id").eq("archived", false).gte("event_date", todayEastern()),
  ]);
  if (seriesRes.error || clientsRes.error || showsRes.error) {
    console.error("series list failed:", seriesRes.error ?? clientsRes.error ?? showsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const upcoming = new Map<string, number>();
  for (const s of showsRes.data ?? []) upcoming.set(s.series_id, (upcoming.get(s.series_id) ?? 0) + 1);
  return NextResponse.json({
    series: (seriesRes.data ?? []).map((s) => ({ ...s, upcoming_shows: upcoming.get(s.id) ?? 0 })),
    clients: clientsRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const rest = Object.fromEntries(Object.entries(body).filter(([k]) => !(SERIES_LOGO_FIELDS as readonly string[]).includes(k)));
  const parsed = parseSeriesPatch(rest, null);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });
  if (!parsed.value.name) return NextResponse.json({ error: "invalid", field: "name", message: "Add the series name." }, { status: 400 });
  if (!parsed.value.slug) return NextResponse.json({ error: "invalid", field: "slug", message: "Add the link name." }, { status: 400 });

  const { data, error } = await serviceClient().from("ln_series").insert(parsed.value).select(SERIES_COLUMNS).single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "invalid", field: "slug", message: "Another series already uses that link." }, { status: 400 });
    console.error("series create failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true, series: data });
}
