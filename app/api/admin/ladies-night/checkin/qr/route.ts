// app/api/admin/ladies-night/checkin/qr/route.ts
//
// GET ?show=<id> -> the door QR code for a show, as an SVG image. Door
// logins get tonight's show only; admins can get any show's, so it can be
// printed ahead (Shows → the show's side panel). Never on a public page.
// Scanning it opens the series page in door mode, which RSVPs and checks
// the guest in. It only works on the night of the show.

import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { doorUrl } from "../../../../../lib/ln/tonight";
import { readShowId, staffTonight } from "../../../../../lib/ln/staff-show";
import { SHOW_COLUMNS, ShowRow } from "../../../../../lib/ln/shows";
import { getSeriesById } from "../../../../../lib/ln/series";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin", "door"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  try {
    const db = serviceClient();
    const asked = readShowId(req.nextUrl.searchParams.get("show"));
    let target: { show: ShowRow; series: { slug: string } } | null = null;
    if (asked && user.role !== "door") {
      const { data: show, error } = await db.from("ln_events").select(SHOW_COLUMNS).eq("id", asked).maybeSingle<ShowRow>();
      if (error) throw error;
      const series = show ? await getSeriesById(db, show.series_id) : null;
      if (show && series) target = { show, series };
    } else {
      const { current } = await staffTonight(db, user, asked);
      target = current;
    }
    if (!target) return NextResponse.json({ error: "no_show_tonight" }, { status: 404 });

    const svg = await QRCode.toString(doorUrl(target.show, target.series), {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: { dark: "#0A0A0A", light: "#F5F0E8" },
    });
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("door qr failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
