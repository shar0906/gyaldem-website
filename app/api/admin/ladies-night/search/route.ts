// app/api/admin/ladies-night/search/route.ts
//
// GET /api/admin/ladies-night/search?q=say+my+name
// Staff-only (admin or artist — uses this directly, admins can too
// if helping her). Searches iTunes server-side; results cached an hour.
//
// This replaces the earlier draft of this route — it now uses the
// renamed staff-auth helper and lives at the correct relative depth
// alongside the other ladies-night routes.
//
// Untested draft — not run inside your repo yet.

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser } from "../../../../lib/admin/staff-auth";

type ItunesResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  releaseDate?: string;
  primaryGenreName?: string;
};

// Best guess only — iTunes often returns a compilation/remaster with a
// later release date, so artist confirms the category in the portal.
function suggestCategory(r: ItunesResult): "80s" | "90s" | "2000s" | "jazz" | null {
  if (r.primaryGenreName?.toLowerCase().includes("jazz")) return "jazz";
  const year = r.releaseDate ? new Date(r.releaseDate).getUTCFullYear() : NaN;
  if (year >= 1980 && year <= 1989) return "80s";
  if (year >= 1990 && year <= 1999) return "90s";
  if (year >= 2000 && year <= 2009) return "2000s";
  return null;
}

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
    suggested_category: suggestCategory(r),
  }));

  return NextResponse.json({ results });
}