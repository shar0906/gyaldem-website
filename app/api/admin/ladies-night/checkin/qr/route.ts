// app/api/admin/ladies-night/checkin/qr/route.ts
//
// GET -> the door QR code for tonight's show, as an SVG image. Admin or
// door logins only, so the code itself never appears on a public page.
// Scanning it opens /ladies-night in door mode, which RSVPs and checks
// the guest in. It only works on the night of the show.

import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { doorUrl, getTonightShow } from "../../../../../lib/ln/tonight";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["admin", "door"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  try {
    const show = await getTonightShow(serviceClient());
    if (!show) return NextResponse.json({ error: "no_show_tonight" }, { status: 404 });

    const svg = await QRCode.toString(doorUrl(show), {
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
