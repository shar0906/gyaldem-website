// app/api/admin/manual/route.ts
//
// GET -> the manual sections this login can read, rendered to HTML.
//   { role, sections: [{ id, title, html, toc }], technical: boolean }
// technical is true for super admins: they can unlock that section separately
// (POST /api/admin/manual/technical) by re-entering their password.

import { NextResponse } from "next/server";
import { requireStaffUser } from "../../../lib/admin/staff-auth";
import { SECTIONS_BY_ROLE, renderSection } from "../../../lib/manual";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireStaffUser(["super_admin", "admin", "artist", "door", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const sections = await Promise.all(SECTIONS_BY_ROLE[user.role].map(renderSection));
    return NextResponse.json(
      { role: user.role, sections, technical: user.role === "super_admin" },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("manual failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
