// middleware.ts (repo root)
//
// Keeps Supabase login sessions fresh. Access tokens expire after about an
// hour; without this, an artist who leaves the dashboard open can start
// getting "unauthorized" on submit. On every staff request this checks the
// session and, when the token is near expiry, writes refreshed cookies.
//
// Scoped to staff and auth routes only, so public pages (the ballot,
// events, the home page) never pay for an auth round-trip.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Triggers the refresh when needed. Don't add code between creating the
  // client and this call; Supabase's docs warn it can log users out.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
