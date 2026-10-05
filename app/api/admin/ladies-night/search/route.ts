// app/api/admin/ladies-night/search/route.ts
//
// GET /api/admin/ladies-night/search?q=say+my+name
// Staff-only (artists search for their own songs; admins can too when
// helping). Searches iTunes server-side; results cached an hour.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser } from "../../../../lib/admin/staff-auth";

type ItunesResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
};

export async function GET(req: NextRequest) {
  const user = await requireStaffUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", q.slice(0, 100));
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "10");
  url.searchParams.set("country", "us");

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json({ error: "search_unavailable" }, { status: 502 });
  }

  const data = (await res.json()) as { results?: ItunesResult[] };

  const results = (data.results ?? []).map((r) => ({
    apple_track_id: r.trackId,
    title: r.trackName,
    artist: r.artistName,
    album: r.collectionName ?? null,
    artwork_url: r.artworkUrl100?.replace("100x100bb", "300x300bb") ?? null,
    apple_music_url: r.trackViewUrl ?? null,
  }));

  return NextResponse.json({ results });
}