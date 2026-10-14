// lib/ln/site.ts
//
// The site's public address, for links in emails, calendars, and QR codes.

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gyaldemsocialclub.com").replace(/\/$/, "");
}
