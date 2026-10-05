// lib/ln/storage.ts
//
// Artist photos live in the public "artist-photos" bucket, one folder per
// artist: artist-photos/<artist id>/<file>. Anyone can view them (they're
// on the ballot page); only the server can hand out upload links.

export const ARTIST_PHOTO_BUCKET = "artist-photos";

export function artistFolderPublicUrl(artistId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${ARTIST_PHOTO_BUCKET}/${artistId}/`;
}
