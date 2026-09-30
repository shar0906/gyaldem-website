// app/auth/confirm/route.ts
//
// The invite/reset-password link lands here first. Exchanges the token
// for a real session SERVER-SIDE (setting cookies) before redirecting
// into the app — this is what avoids the classic "Auth session missing!"
// bug that happens when relying on Supabase's default hash-fragment
// link, which server routes/route handlers can't read at all.
//
// Requires the Supabase "Invite user" email template to be updated —
// see the instructions below the code.
//
// Untested draft — not run inside your repo yet.

import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin";

  if (token_hash && type) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
    console.error("token verification failed:", error);
  }

  redirect("/admin?error=invite_link_invalid");
}