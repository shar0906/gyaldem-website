// app/api/admin/ladies-night/clients/route.ts
//
// Admin-only. Clients: who presents a series (e.g. Where's Jeanie). Their
// logo shows in the footer of their series' pages, and their contact
// email gets the recap after each show.
// GET  -> { clients }   each with how many series they present
// POST -> create { name, instagram_handle?, website_url?, contact_email? }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { CLIENT_COLUMNS, ClientRow, parseClientPatch } from "../../../../lib/ln/series";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = serviceClient();
  const [clientsRes, seriesRes] = await Promise.all([
    db.from("ln_clients").select(CLIENT_COLUMNS).order("name").returns<ClientRow[]>(),
    db.from("ln_series").select("client_id, name"),
  ]);
  if (clientsRes.error || seriesRes.error) {
    console.error("clients list failed:", clientsRes.error ?? seriesRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const names = new Map<string, string[]>();
  for (const s of seriesRes.data ?? []) if (s.client_id) names.set(s.client_id, [...(names.get(s.client_id) ?? []), s.name]);
  return NextResponse.json({ clients: (clientsRes.data ?? []).map((c) => ({ ...c, series: names.get(c.id) ?? [] })) });
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const { logo_url: _ignored, ...rest } = body;
  const parsed = parseClientPatch(rest, null);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.message }, { status: 400 });
  if (!parsed.value.name) return NextResponse.json({ error: "invalid", field: "name", message: "Add the client's name." }, { status: 400 });
  const { data, error } = await serviceClient().from("ln_clients").insert(parsed.value).select(CLIENT_COLUMNS).single();
  if (error) {
    console.error("client create failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true, client: data });
}
