// lib/ln/brand-upload.ts
//
// Signed one-time upload links into the public ln-brand bucket, for series
// images (event logos, cover photo) and client logos. The browser uploads
// the file straight to storage, then saves the public URL on the record.

import { randomUUID } from "node:crypto";
import { serviceClient } from "../admin/staff-auth";
import { BRAND_BUCKET } from "./venues";

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp" };
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const LOGO_MAX = 2 * 1024 * 1024;
const PHOTO_MAX = 10 * 1024 * 1024;

export type BrandUpload =
  | { ok: true; path: string; token: string; signed_url: string; public_url: string }
  | { ok: false; status: number; error: string; message?: string };

export async function createBrandUpload(
  folder: "series" | "clients",
  id: string,
  kind: "title" | "presents" | "cover" | "logo",
  contentType: unknown,
  size: unknown
): Promise<BrandUpload> {
  const photo = kind === "cover";
  const ext = (photo ? PHOTO_TYPES : LOGO_TYPES)[typeof contentType === "string" ? contentType : ""];
  if (!ext) {
    return {
      ok: false,
      status: 400,
      error: "bad_type",
      message: photo ? "Use a JPG, PNG, or WebP photo." : "Use a PNG or WebP logo with a transparent background.",
    };
  }
  const max = photo ? PHOTO_MAX : LOGO_MAX;
  const n = typeof size === "number" ? size : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > max) {
    return { ok: false, status: 400, error: "too_large", message: `That file is over ${max / 1024 / 1024} MB.` };
  }
  const path = `${folder}/${id}/${kind}-${randomUUID()}.${ext}`;
  const storage = serviceClient().storage.from(BRAND_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error("brand upload url failed:", error);
    return { ok: false, status: 500, error: "server_error" };
  }
  return { ok: true, path: data.path, token: data.token, signed_url: data.signedUrl, public_url: storage.getPublicUrl(path).data.publicUrl };
}
