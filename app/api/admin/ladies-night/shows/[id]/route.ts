// app/api/admin/ladies-night/shows/[id]/route.ts
//
// Admin-only.
//
// GET   -> { show, artist, songs }
//   songs: the ballot in order, each with its current vote count.
//
// PATCH -> edit any show settings; changes go live right away.
//   Body: any subset of the fields accepted on create, plus archived.
//   - Changing the artist clears the old artist's draft songs (they were
//     proposed for someone else's set). Not allowed once the ballot is
//     published.
//   - Title, description, date, and times are mirrored to the site's
//     public Events page.
//   200 { success: true, show, drafts_cleared }
//   400 { error: "invalid", field, message }
//   404 not_found
//   409 ballot_published

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient, ARTIST_COLUMNS } from "../../../../../lib/admin/staff-auth";
import { parseShowPatch } from "../../../../../lib/ln/show-rules";
import { showStage } from "../../../../../lib/ln/show-status";
import { SHOW_COLUMNS, ShowRow, checkBookableArtist, checkVenue, syncPublicEvent } from "../../../../../lib/ln/shows";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const db = serviceClient();

  const { data: show, error } = await db.from("ln_events").select(SHOW_COLUMNS).eq("id", id).maybeSingle<ShowRow>();
  if (error) {
    console.error("show lookup failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!show) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [artistRes, songsRes, resultsRes] = await Promise.all([
    show.artist_id
      ? db.from("ln_artists").select(ARTIST_COLUMNS).eq("id", show.artist_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db
      .from("ln_event_songs")
      .select("song_id, status, sort_order, proposed_by, published_by, published_at, ln_repertoire(title, artist, artwork_url)")
      .eq("event_id", id)
      .order("sort_order", { ascending: true }),
    db.from("ln_results").select("song_id, votes").eq("event_id", id),
  ]);
  if (artistRes.error || songsRes.error || resultsRes.error) {
    console.error("show detail failed:", artistRes.error ?? songsRes.error ?? resultsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const votes = new Map((resultsRes.data ?? []).map((r) => [r.song_id, r.votes as number]));
  const songs = (songsRes.data ?? []).map((s) => ({ ...s, votes: votes.get(s.song_id) ?? 0 }));

  return NextResponse.json({ show: { ...show, stage: showStage(show) }, artist: artistRes.data, songs });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const parsed = parseShowPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.error }, { status: 400 });
  }
  const patch = parsed.value;

  const db = serviceClient();
  const { data: current, error: currentError } = await db
    .from("ln_events")
    .select(SHOW_COLUMNS)
    .eq("id", id)
    .maybeSingle<ShowRow>();
  if (currentError) {
    console.error("show lookup failed:", currentError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Voting window has to stay valid against whichever side isn't changing.
  const opens = patch.voting_opens_at ?? current.voting_opens_at;
  const closes = patch.voting_closes_at ?? current.voting_closes_at;
  if (new Date(opens).getTime() >= new Date(closes).getTime()) {
    return NextResponse.json(
      { error: "invalid", field: "voting_closes_at", message: "Voting has to close after it opens." },
      { status: 400 }
    );
  }

  if (patch.venue_id && patch.venue_id !== current.venue_id) {
    const check = await checkVenue(db, patch.venue_id);
    if (check === "error") return NextResponse.json({ error: "server_error" }, { status: 500 });
    if (check !== "ok") {
      return NextResponse.json({ error: "invalid", field: "venue_id", message: "That venue isn't available." }, { status: 400 });
    }
  }

  let draftsCleared = 0;
  const artistChanging = "artist_id" in patch && patch.artist_id !== current.artist_id;
  if (artistChanging) {
    const { data: ballot, error: ballotError } = await db
      .from("ln_event_songs")
      .select("status")
      .eq("event_id", id);
    if (ballotError) {
      console.error("ballot check failed:", ballotError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if ((ballot ?? []).some((s) => s.status === "published")) {
      return NextResponse.json({ error: "ballot_published" }, { status: 409 });
    }
    if (patch.artist_id) {
      const check = await checkBookableArtist(db, patch.artist_id);
      if (check === "error") return NextResponse.json({ error: "server_error" }, { status: 500 });
      if (check !== "ok") {
        return NextResponse.json(
          { error: "invalid", field: "artist_id", message: "That artist isn't available to book." },
          { status: 400 }
        );
      }
    }
    draftsCleared = (ballot ?? []).length;
  }

  const { data: show, error: updateError } = await db
    .from("ln_events")
    .update(patch)
    .eq("id", id)
    .select(SHOW_COLUMNS)
    .single<ShowRow>();
  if (updateError || !show) {
    if (updateError?.code === "23514") {
      return NextResponse.json({ error: "invalid", field: "voting_closes_at", message: "Check the voting window." }, { status: 400 });
    }
    console.error("show update failed:", updateError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (artistChanging && draftsCleared > 0) {
    const { error: clearError } = await db.from("ln_event_songs").delete().eq("event_id", id).eq("status", "draft");
    if (clearError) console.error("clearing old artist drafts failed:", clearError);
  }

  const mirrored = ["title", "gate_description", "event_date", "event_start_time", "event_end_time", "venue_id"];
  if (mirrored.some((k) => k in patch)) await syncPublicEvent(db, show);

  return NextResponse.json({ success: true, show: { ...show, stage: showStage(show) }, drafts_cleared: draftsCleared });
}
