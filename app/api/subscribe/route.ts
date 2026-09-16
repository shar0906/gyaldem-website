import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // -------------------------------------------------------------------------
    // ACTION 1 — Save to Supabase (Safe initialization wrapper for npm run build)
    // -------------------------------------------------------------------------
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey!);
      
      await supabase
        .from("applications")
        .upsert(
          {
            first_name: firstName,
            email: email,
            tier: tier || "collective",
            neighborhood: neighborhood || "",
            bio: bio || "",
            diaspora_concept: diasporaConcept || "",
            release_intent: releaseIntent || "",
            pillars: pillars || []
          },
          { onConflict: "email" }
        );
    }

    // -------------------------------------------------------------------------
    // ACTION 2 — Your original Kit subscription logic (Fixed V4 URL)
    // -------------------------------------------------------------------------
    const subscriberRes = await fetch("https://api.kit.com/v4/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": process.env.KIT_API_KEY!,
      },
      body: JSON.stringify({
        email_address: email,
        first_name: firstName,
        fields: {
          tier: tier || "collective" // Only text data Kit needs for Liquid routing
        }
      }),
    });

    if (!subscriberRes.ok) {
      return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
    }

    const subscriberData = await subscriberRes.json();
    const subscriberId = subscriberData.subscriber?.id;

    if (!subscriberId) {
      return NextResponse.json({ error: "No subscriber ID returned" }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // ACTION 3 — Add subscriber to form (Fixed V4 URL & Missing Slash)
    // -------------------------------------------------------------------------
    const formRes = await fetch(
    `https://kit.com{targetFormId}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY!,
        },
      }
    );

    // -------------------------------------------------------------------------
    // ACTION 4 — Live Free Google Sheet Sync Bypass
    // -------------------------------------------------------------------------
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      // Fires as a background fetch task so it won't slow down the user's browser response
      fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          email,
          tier,
          neighborhood,
          bio,
          diasporaConcept,
          releaseIntent,
          pillars
        }),
      }).catch((err) => console.error("Google Sheets sync error catch:", err));
    }

    if (!formRes.ok) {
      return NextResponse.json({ error: "Failed to add to form" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}