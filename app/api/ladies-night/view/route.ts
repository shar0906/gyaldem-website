// app/api/ladies-night/view/route.ts
//
// POST /api/ladies-night/view   Body: { show_id }
// Public. Counts a visit to a series page for the show's stats and the
// client recap. The page sends this once per device per show.

import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "../../../lib/admin/staff-auth";
import { limited, tooMany } from "../../../lib/ln/public-guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  if (limited(req, "page-view", 6)) return tooMany();
  const body = (await req.json().catch(() => null)) as { show_id?: unknown } | null;
  const id = typeof body?.show_id === "string" && UUID.test(body.show_id) ? body.show_id : null;
  if (!id) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const { error } = await serviceClient().rpc("ln_count_page_view", { p_event: id });
  if (error) console.error("page view count failed:", error);
  return NextResponse.json({ success: true });
}
