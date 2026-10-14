// app/api/admin/ladies-night/checkin/qr/route.ts
//
// GET ?show=<id> -> the door QR code for tonight's show, as an SVG image.
// Admin or door logins only, so the code itself never appears on a public
// page. Scanning it opens the series page in door mode, which RSVPs and
// checks the guest in. It only works on the night of the show.

import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { doorUrl } from "../../../../../lib/ln/tonight";
import { staffTonight } from "../../../../../lib/ln/staff-show";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin", "door"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  try {
    const { current } = await staffTonight(serviceClient(), user, req.nextUrl.searchParams.get("show"));
    if (!current) return NextResponse.json({ error: "no_show_tonight" }, { status: 404 });

    const svg = await QRCode.toString(doorUrl(current.show, current.series), {
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
