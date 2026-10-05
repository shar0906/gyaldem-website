// lib/ln/songs.ts
//
// Turning what an artist picked (library songs, Apple Music search
// results, manual entries) into catalog ids. Shared by Propose and by
// adding songs straight to the library.
//
//   1. repertoire_id set: must already be in this artist's library.
//   2. apple_track_id set: reuses the catalog row for that track if one
//      exists (from any artist), otherwise adds it. Never overwrites it.
//   3. neither: a manual entry (jazz standards, etc.), always added new.

import type { SupabaseClient } from "@supabase/supabase-js";

const TEXT_MAX = 200;

export type CleanSong = {
  repertoire_id: string | null;
  title: string;
  artist: string;
  artwork_url: string | null;
  apple_track_id: number | null;
  apple_music_url: string | null;
};

function cleanUrl(v: unknown): string | null {
  return typeof v === "string" && v.startsWith("https://") && v.length <= 1000 ? v : null;
}

export function cleanSong(raw: unknown): CleanSong | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const title = typeof s.title === "string" ? s.title.trim() : "";
  const artist = typeof s.artist === "string" ? s.artist.trim() : "";
  if (!title || !artist || title.length > TEXT_MAX || artist.length > TEXT_MAX) return null;
  const trackId =
    typeof s.apple_track_id === "number" && Number.isSafeInteger(s.apple_track_id) && s.apple_track_id > 0
      ? s.apple_track_id
      : null;
  return {
    repertoire_id: typeof s.repertoire_id === "string" && s.repertoire_id ? s.repertoire_id : null,
    title,
    artist,
    artwork_url: cleanUrl(s.artwork_url),
    apple_track_id: trackId,
    apple_music_url: cleanUrl(s.apple_music_url),
  };
}

export type ResolveResult = { ok: true; ids: string[] } | { ok: false; status: number; error: string };

// Resolves songs to catalog ids in the order given, dropping repeats.
export async function resolveSongIds(db: SupabaseClient, artistId: string, songs: CleanSong[]): Promise<ResolveResult> {
  const libraryIds = [...new Set(songs.flatMap((s) => (s.repertoire_id ? [s.repertoire_id] : [])))];
  if (libraryIds.length) {
    const { data: owned, error } = await db
      .from("ln_artist_library")
      .select("song_id")
      .eq("artist_id", artistId)
      .in("song_id", libraryIds);
    if (error) {
      console.error("library check failed:", error);
      return { ok: false, status: 500, error: "server_error" };
    }
    const ownedSet = new Set((owned ?? []).map((r) => r.song_id as string));
    if (libraryIds.some((id) => !ownedSet.has(id))) return { ok: false, status: 400, error: "unknown_song" };
  }

  const trackIds = [
    ...new Set(songs.flatMap((s) => (!s.repertoire_id && s.apple_track_id ? [s.apple_track_id] : []))),
  ];
  const idByTrack = new Map<number, string>();
  if (trackIds.length) {
    const lookup = async () => {
      const { data, error } = await db.from("ln_repertoire").select("id, apple_track_id").in("apple_track_id", trackIds);
      if (error) throw error;
      for (const row of data ?? []) idByTrack.set(Number(row.apple_track_id), row.id as string);
    };
    try {
      await lookup();
      const seen = new Set<number>();
      const toInsert = songs
        .filter((s) => !s.repertoire_id && s.apple_track_id && !idByTrack.has(s.apple_track_id))
        .filter((s) => (seen.has(s.apple_track_id!) ? false : (seen.add(s.apple_track_id!), true)))
        .map((s) => ({
          title: s.title,
          artist: s.artist,
          artwork_url: s.artwork_url,
          apple_track_id: s.apple_track_id,
          apple_music_url: s.apple_music_url,
          source: "itunes",
        }));
      if (toInsert.length) {
        // ignoreDuplicates covers another artist adding the same track at
        // the same moment; the second lookup picks it up.
        const { error } = await db.from("ln_repertoire").upsert(toInsert, { onConflict: "apple_track_id", ignoreDuplicates: true });
        if (error) throw error;
        await lookup();
      }
    } catch (error) {
      console.error("catalog upsert failed:", error);
      return { ok: false, status: 500, error: "server_error" };
    }
  }

  const manual = songs.filter((s) => !s.repertoire_id && !s.apple_track_id);
  const manualIds: string[] = [];
  if (manual.length) {
    const { data, error } = await db
      .from("ln_repertoire")
      .insert(manual.map((s) => ({ title: s.title, artist: s.artist, artwork_url: s.artwork_url, source: "manual" })))
      .select("id");
    if (error) {
      console.error("manual insert failed:", error);
      return { ok: false, status: 500, error: "server_error" };
    }
    manualIds.push(...(data ?? []).map((r) => r.id as string));
  }

  let manualIndex = 0;
  const ids: string[] = [];
  for (const s of songs) {
    const id = s.repertoire_id ?? (s.apple_track_id ? idByTrack.get(s.apple_track_id) : manualIds[manualIndex++]);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return { ok: true, ids };
}

export async function addToLibrary(db: SupabaseClient, artistId: string, songIds: string[]): Promise<boolean> {
  if (!songIds.length) return true;
  const { error } = await db
    .from("ln_artist_library")
    .upsert(songIds.map((songId) => ({ artist_id: artistId, song_id: songId })), {
      onConflict: "artist_id,song_id",
      ignoreDuplicates: true,
    });
  if (error) console.error("library upsert failed:", error);
  return !error;
}
