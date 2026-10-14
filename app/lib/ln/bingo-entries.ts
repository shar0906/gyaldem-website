// lib/ln/bingo-entries.ts
//
// Checks for bingo deck lines. Match decks need only the line; Callout ->
// Answer decks need the callout and a song, artist, or both (kept as
// separate fields, joined only for display).

export type DeckEntryInput = { line?: unknown; song?: unknown; artist?: unknown };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// "12. Say Less" -> "Say Less"; also "12) " and "12 - ".
export function stripNumbering(s: string): string {
  return s.trim().replace(/^\d{1,3}\s*[.)\-:]\s+/, "").trim();
}

export function cleanDeckEntry(
  raw: DeckEntryInput,
  kind: "match" | "callout_answer"
): { line: string; song: string | null; artist: string | null } | string {
  const line = str(raw.line);
  if (!line) return kind === "match" ? "Needs the line." : "Needs the callout.";
  if (line.length > 300) return "Line is over 300 characters.";
  if (kind === "match") return { line, song: null, artist: null };
  const song = str(raw.song) || null;
  const artist = str(raw.artist) || null;
  if (!song && !artist) return "Needs the answer: a song, an artist, or both.";
  if ((song?.length ?? 0) > 200 || (artist?.length ?? 0) > 120) return "Song or artist is too long.";
  return { line, song, artist };
}
