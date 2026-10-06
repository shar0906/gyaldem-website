// lib/ln/uploads.ts
//
// Signed one-time upload links into an artist's own photo folder. Used by
// the artist's Profile tab and by admins editing an artist directly.

import { randomUUID } from "node:crypto";
import { serviceClient } from "../admin/staff-auth";
import { COVER_MAX_BYTES, IMAGE_TYPES, LOGO_MAX_BYTES, LOGO_TYPES, PHOTO_MAX_BYTES } from "./profile-rules";
import { ARTIST_PHOTO_BUCKET } from "./storage";

export type UploadResult =
  | { ok: true; path: string; token: string; signed_url: string; public_url: string }
  | { ok: false; status: number; error: string; message?: string };

export async function createArtistUpload(artistId: string, body: unknown): Promise<UploadResult> {
  const b = (body ?? {}) as { kind?: unknown; content_type?: unknown; size?: unknown };
  const kind = b.kind === "photo" || b.kind === "cover" || b.kind === "logo" ? b.kind : null;
  const contentType = typeof b.content_type === "string" ? b.content_type : "";
  const size = typeof b.size === "number" ? b.size : NaN;

  if (!kind) return { ok: false, status: 400, error: "missing_fields" };

  const ext = (kind === "logo" ? LOGO_TYPES : IMAGE_TYPES)[contentType];
  if (!ext) {
    return {
      ok: false,
      status: 400,
      error: "bad_type",
      message: kind === "logo" ? "Use a PNG or WebP logo, ideally with a transparent background." : "Use a JPG, PNG, or WebP image.",
    };
  }

  const max = kind === "photo" ? PHOTO_MAX_BYTES : kind === "logo" ? LOGO_MAX_BYTES : COVER_MAX_BYTES;
  if (!Number.isFinite(size) || size <= 0 || size > max) {
    return { ok: false, status: 400, error: "too_large", message: `That image is over ${max / 1024 / 1024} MB.` };
  }

  const path = `${artistId}/${kind}-${randomUUID()}.${ext}`;
  const storage = serviceClient().storage.from(ARTIST_PHOTO_BUCKET);

  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error("signed upload url failed:", error);
    return { ok: false, status: 500, error: "server_error" };
  }

  const { data: pub } = storage.getPublicUrl(path);
  return { ok: true, path: data.path, token: data.token, signed_url: data.signedUrl, public_url: pub.publicUrl };
}
