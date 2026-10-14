// app/api/admin/ladies-night/checkin/route.ts
//
// Door check-in for tonight's show. Admin or door logins; hosts can read
// the list (the host console's Guests tab). Logins limited to a series
// only see that series' show.
//
// GET ?show=<id>[&format=csv] -> { show, shows, counts, guests }
//   The door screen refreshes this every couple of seconds, so check-ins
//   from other phones show up. show is null when there's no show tonight;
//   shows lists tonight's shows this login can pick from. format=csv
//   downloads the list.
//
// POST -> { show_id?, rsvp_id, checked_in: true | false }
//   Check a guest in, or undo it. Only for tonight's guests.
//   200 { success: true, checked_in_at }

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../lib/admin/staff-auth";
import { staffTonight } from "../../../../lib/ln/staff-show";
import { publicArtist } from "../../../../lib/ln/public-show";
import { csvResponse, toCsv } from "../../../../lib/ln/csv";
import { getVenue } from "../../../../lib/ln/venues";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  source: string;
  table_party_size: number | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  posh_clicked_at: string | null;
  posh_confirmed_at: string | null;
  ln_voters: { first_name: string | null; last_name: string | null; name: string; email: string } | null;
};

export async function GET(req: NextRequest) {
  const user = await requireStaffUser(["admin", "door", "host"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = serviceClient();
  try {
    const { current, options } = await staffTonight(db, user, req.nextUrl.searchParams.get("show"));
    if (!current) return NextResponse.json({ show: null, shows: [] }, { headers: { "Cache-Control": "no-store" } });
    const { show, series } = current;

    const [rsvpRes, vipRes, artist, venue] = await Promise.all([
      db
        .from("ln_rsvps")
        .select("id, source, table_party_size, checked_in_at, checked_in_by, posh_clicked_at, posh_confirmed_at, ln_voters(first_name, last_name, name, email)")
        .eq("event_id", show.id)
        .returns<Row[]>(),
      db.from("ln_vip_orders").select("rsvp_id, quantity").eq("event_id", show.id).eq("status", "paid"),
      series.feat_voting ? publicArtist(db, show.artist_id) : Promise.resolve(null),
      getVenue(db, show.venue_id),
    ]);
    if (rsvpRes.error || vipRes.error) throw rsvpRes.error ?? vipRes.error;

    const vip = new Map<string, number>();
    for (const o of vipRes.data ?? []) vip.set(o.rsvp_id, (vip.get(o.rsvp_id) ?? 0) + o.quantity);

    const guests = (rsvpRes.data ?? [])
      .map((r) => {
        const first = r.ln_voters?.first_name ?? r.ln_voters?.name ?? "";
        const last = r.ln_voters?.last_name ?? "";
        return {
          rsvp_id: r.id,
          first_name: first,
          last_name: last,
          email: r.ln_voters?.email ?? "",
          vip_passes: vip.get(r.id) ?? 0,
          walk_in: r.source !== "gate",
          party_size: r.table_party_size,
          posh: r.posh_confirmed_at ? "done" : r.posh_clicked_at ? "opened" : null,
          checked_in_at: r.checked_in_at,
        };
      })
      .sort((a, b) => a.first_name.localeCompare(b.first_name) || a.last_name.localeCompare(b.last_name));

    const counts = {
      rsvps: guests.length,
      checked_in: guests.filter((g) => g.checked_in_at).length,
      vip_passes: guests.reduce((n, g) => n + g.vip_passes, 0),
      vip_passes_in: guests.reduce((n, g) => n + (g.checked_in_at ? g.vip_passes : 0), 0),
    };

    if (req.nextUrl.searchParams.get("format") === "csv") {
      return csvResponse(
        `${series.slug}-${show.event_date}-guests.csv`,
        toCsv(
          ["First name", "Last name", "Email", "Party size", "VIP passes", "Posh", "Checked in"],
          guests.map((g) => [g.first_name, g.last_name, g.email, g.party_size, g.vip_passes, g.posh ?? "", g.checked_in_at ? "yes" : ""])
        )
      );
    }

    return NextResponse.json(
      {
        show: {
          id: show.id,
          title: show.title,
          event_date: show.event_date,
          event_start_time: show.event_start_time,
          artist_name: artist?.display_name ?? null,
          venue_name: venue?.name ?? null,
          series_name: series.name,
          door_enabled: series.feat_door,
        },
        shows: options,
        counts,
        guests,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("check-in list failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireStaffUser(["admin", "door"]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { show_id?: unknown; rsvp_id?: unknown; checked_in?: unknown } | null;
  const rsvpId = typeof body?.rsvp_id === "string" ? body.rsvp_id : null;
  if (!rsvpId || typeof body?.checked_in !== "boolean") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = serviceClient();
  try {
    const { current } = await staffTonight(db, user, body.show_id);
    if (!current) return NextResponse.json({ error: "no_show_tonight" }, { status: 409 });
    const { show } = current;

    const checkedInAt = body.checked_in ? new Date().toISOString() : null;
    const { data, error } = await db
      .from("ln_rsvps")
      .update({ checked_in_at: checkedInAt, checked_in_by: body.checked_in ? user.email : null })
      .eq("id", rsvpId)
      .eq("event_id", show.id)
      .select("id");
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ success: true, checked_in_at: checkedInAt });
  } catch (error) {
    console.error("check-in failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
