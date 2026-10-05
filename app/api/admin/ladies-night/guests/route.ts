// app/api/admin/ladies-night/guests/route.ts
//
// GET ?event_id=<id>                  -> { summary, guests }   Admin-only.
// GET ?event_id=<id>&format=csv&list=rsvps   -> RSVP list as CSV
// GET ?event_id=<id>&format=csv&list=vip     -> VIP (wristband) list as CSV
//
// One row per RSVP: name, email, how they arrived, whether they voted,
// table reserved, paid VIP passes, artist-sharing opt-in, and check-in.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { csvResponse, toCsv } from "../../../../lib/ln/csv";

export const dynamic = "force-dynamic";

type RsvpRow = {
  id: string;
  voter_id: string;
  source: "gate" | "door_qr" | "door_manual";
  consented_at: string;
  share_with_artist: boolean;
  table_reserved_at: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  ln_voters: { first_name: string | null; last_name: string | null; name: string; email: string } | null;
};

const SOURCE_LABEL: Record<RsvpRow["source"], string> = {
  gate: "Gate",
  door_qr: "Door QR",
  door_manual: "Door (typed in)",
};

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const db = serviceClient();
  const [showRes, rsvpRes, ballotRes, vipRes] = await Promise.all([
    db.from("ln_events").select("id, slug, title, event_date").eq("id", eventId).maybeSingle(),
    db
      .from("ln_rsvps")
      .select(
        "id, voter_id, source, consented_at, share_with_artist, table_reserved_at, checked_in_at, checked_in_by, ln_voters(first_name, last_name, name, email)"
      )
      .eq("event_id", eventId)
      .order("consented_at", { ascending: true })
      .returns<RsvpRow[]>(),
    db.from("ln_ballots").select("voter_id").eq("event_id", eventId),
    db.from("ln_vip_orders").select("rsvp_id, quantity, amount_cents, paid_at, refunded_at, status").eq("event_id", eventId),
  ]);
  const failed = showRes.error ?? rsvpRes.error ?? ballotRes.error ?? vipRes.error;
  if (failed) {
    console.error("guests lookup failed:", failed);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!showRes.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const voted = new Set((ballotRes.data ?? []).map((b) => b.voter_id as string));
  const vipByRsvp = new Map<string, number>();
  for (const o of vipRes.data ?? []) {
    if (o.status === "paid") vipByRsvp.set(o.rsvp_id, (vipByRsvp.get(o.rsvp_id) ?? 0) + o.quantity);
  }

  const guests = (rsvpRes.data ?? []).map((r) => {
    const v = r.ln_voters;
    const first = v?.first_name ?? v?.name ?? "";
    const last = v?.last_name ?? "";
    return {
      rsvp_id: r.id,
      first_name: first,
      last_name: last,
      name: [first, last].filter(Boolean).join(" "),
      email: v?.email ?? "",
      source: r.source,
      rsvp_at: r.consented_at,
      voted: voted.has(r.voter_id),
      table_reserved: !!r.table_reserved_at,
      vip_passes: vipByRsvp.get(r.id) ?? 0,
      share_with_artist: r.share_with_artist,
      checked_in_at: r.checked_in_at,
      checked_in_by: r.checked_in_by,
    };
  });

  const params = req.nextUrl.searchParams;
  if (params.get("format") === "csv") {
    const base = `ladies-night-${showRes.data.event_date}`;
    if (params.get("list") === "vip") {
      const rows = guests
        .filter((g) => g.vip_passes > 0)
        .map((g) => [g.name, g.email, g.vip_passes, g.checked_in_at ? "Yes" : "No"]);
      return csvResponse(`${base}-vip.csv`, toCsv(["Name", "Email", "VIP passes", "Checked in"], rows));
    }
    const rows = guests.map((g) => [
      g.first_name,
      g.last_name,
      g.email,
      SOURCE_LABEL[g.source],
      g.rsvp_at,
      g.voted ? "Yes" : "No",
      g.table_reserved ? "Yes" : "No",
      g.vip_passes,
      g.share_with_artist ? "Yes" : "No",
      g.checked_in_at ?? "",
    ]);
    return csvResponse(
      `${base}-rsvps.csv`,
      toCsv(
        ["First name", "Last name", "Email", "Arrived via", "RSVP time", "Voted", "Table reserved", "VIP passes", "Shares with artist", "Checked in"],
        rows
      )
    );
  }

  const summary = {
    rsvps: guests.length,
    voted: guests.filter((g) => g.voted).length,
    tables_reserved: guests.filter((g) => g.table_reserved).length,
    vip_passes_sold: guests.reduce((n, g) => n + g.vip_passes, 0),
    sharing_with_artist: guests.filter((g) => g.share_with_artist).length,
    checked_in: guests.filter((g) => g.checked_in_at).length,
  };

  return NextResponse.json({ show: showRes.data, summary, guests });
}
