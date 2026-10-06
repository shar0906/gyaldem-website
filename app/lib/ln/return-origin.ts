// lib/ln/return-origin.ts
//
// Where to send a guest back to after Stripe: the same site they paid
// from. A browser's remembered-guest cookie belongs to one address
// (gyaldemsocialclub.com, www.gyaldemsocialclub.com, or a Railway URL), so
// returning them anywhere else would make them look like a new guest.
// Only known Gyal Dem addresses are allowed; anything else falls back to
// the main site.

import type { NextRequest } from "next/server";
import { siteUrl } from "./tonight";

function allowedHost(host: string): boolean {
  const configured = (() => {
    try {
      return new URL(siteUrl()).host;
    } catch {
      return "";
    }
  })();
  return (
    host === configured ||
    host === "gyaldemsocialclub.com" ||
    host === "www.gyaldemsocialclub.com" ||
    host.endsWith(".up.railway.app") ||
    host === "localhost" ||
    host.startsWith("localhost:")
  );
}

export function returnOrigin(req: NextRequest): string {
  const candidates = [
    req.headers.get("origin"),
    (() => {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      return host ? `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}` : null;
    })(),
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      const u = new URL(c);
      if ((u.protocol === "https:" || u.hostname === "localhost") && allowedHost(u.host)) return u.origin;
    } catch {
      /* try the next one */
    }
  }
  return siteUrl();
}
