// lib/ln/profile-rules.ts
//
// Validation shared by the artist Profile routes (and, later, the admin
// edit and approval routes). The database enforces the same limits with
// CHECK constraints; these give friendly errors before it gets that far.

export const BIO_MAX = 280;
export const NAME_MAX = 80;
export const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
export const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// Cream text sits on the primary color; button text sits on the accent.
export const CREAM = "#FBF3EC";
export const MIN_CONTRAST_PRIMARY = 4.5; // body text
export const MIN_CONTRAST_ACCENT = 3; // large, bold button text

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
// Logos sit on dark backgrounds, so PNG or WebP (both allow transparency).
// SVG is left out on purpose: SVG files can carry code.
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
};
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Returns a plain-language problem, or null when the pair is readable.
export function colorProblem(primary: string, accent: string): string | null {
  if (!HEX_PATTERN.test(primary) || !HEX_PATTERN.test(accent)) {
    return "Colors must be hex values like #6E1420.";
  }
  if (contrastRatio(CREAM, primary) < MIN_CONTRAST_PRIMARY) {
    return "Text is hard to read on this primary color. Try a deeper shade.";
  }
  if (contrastRatio(CREAM, accent) < MIN_CONTRAST_ACCENT) {
    return "Button text is hard to read on this accent color. Try a deeper shade.";
  }
  return null;
}

export type ProfileInput = {
  display_name: string;
  bio: string | null;
  instagram_handle: string | null;
  primary_color: string;
  accent_color: string;
  photo_url: string | null;
  cover_url: string | null;
  logo_url: string | null;
  website_url: string | null;
};

function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

// Normalizes and validates a profile submission. `ownFolderUrl` is the
// public URL prefix of the artist's own storage folder; photo URLs must
// live there, so nobody can point their profile at someone else's file.
export function parseProfile(
  body: Record<string, unknown>,
  ownFolderUrl: string
): { ok: true; value: ProfileInput } | { ok: false; error: string; field: string } {
  const display_name = cleanText(body.display_name);
  if (!display_name) return { ok: false, field: "display_name", error: "Add the name guests will see." };
  if (display_name.length > NAME_MAX) {
    return { ok: false, field: "display_name", error: `Keep the name under ${NAME_MAX} characters.` };
  }

  const bio = cleanText(body.bio);
  if (bio && bio.length > BIO_MAX) {
    return { ok: false, field: "bio", error: `Keep the bio to ${BIO_MAX} characters.` };
  }

  const igRaw = cleanText(body.instagram_handle);
  const instagram_handle = igRaw ? igRaw.replace(/^@/, "") : null;
  if (instagram_handle && !INSTAGRAM_PATTERN.test(instagram_handle)) {
    return {
      ok: false,
      field: "instagram_handle",
      error: "Instagram handles use only letters, numbers, periods, and underscores.",
    };
  }

  const primary_color = (cleanText(body.primary_color) ?? "").toUpperCase();
  const accent_color = (cleanText(body.accent_color) ?? "").toUpperCase();
  const problem = colorProblem(primary_color, accent_color);
  if (problem) return { ok: false, field: "colors", error: problem };

  const website_url = cleanText(body.website_url);
  if (website_url && (website_url.length > 300 || !/^https:\/\/[^\s]+\.[^\s]+/.test(website_url))) {
    return { ok: false, field: "website_url", error: "Use a full web address starting with https://" };
  }

  const photo_url = cleanText(body.photo_url);
  const cover_url = cleanText(body.cover_url);
  const logo_url = cleanText(body.logo_url);
  for (const [field, url] of [["photo_url", photo_url], ["cover_url", cover_url], ["logo_url", logo_url]] as const) {
    if (url && !url.startsWith(ownFolderUrl)) {
      return { ok: false, field, error: "Upload photos through the Profile tab." };
    }
  }

  return {
    ok: true,
    value: { display_name, bio, instagram_handle, primary_color, accent_color, photo_url, cover_url, logo_url, website_url },
  };
}
