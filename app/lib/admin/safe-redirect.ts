// lib/admin/safe-redirect.ts
//
// Only allow redirects to paths on this site. Blocks crafted links like
// /auth/confirm?...&next=https://evil.example, and protocol-relative
// tricks like //evil.example or /\evil.example.

export function safeNextPath(next: string | null | undefined, fallback = "/admin"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
