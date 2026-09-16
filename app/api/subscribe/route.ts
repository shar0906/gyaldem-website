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
    // ACTION 2 — Create or update subscriber profile in Kit V4 API
    // -------------------------------------------------------------------------
    const subscriberRes = await fetch("https://kit.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": process.env.KIT_API_KEY!,
      },
      body: JSON.stringify({
        email_address: email,
        first_name: firstName,
        fields: {
          tier: tier || "collective"
        }
      }),
    });

    if (!subscriberRes.ok) {
      const errorText = await subscriberRes.text();
      console.error("Kit subscriber creation failed:", errorText);
      return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
    }

    const subscriberData = await subscriberRes.json();
    const subscriberId = subscriberData.subscriber?.id;

    if (!subscriberId) {
      return NextResponse.json({ error: "No subscriber ID returned" }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // ACTION 3 — Add subscriber to the correct form path (Dynamic Routing)
    // -------------------------------------------------------------------------
    const targetFormId = (tier === "mailing") 
      ? process.env.KIT_MAILING_FORM_ID 
      : process.env.KIT_MEMBERSHIP_FORM_ID;

    if (!targetFormId) {
      console.error("Missing targeting configuration for Kit form mapping.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // ⚡ FIXED TEMPLATE LITERAL STRINGS NATIVELY HERE
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

    console.log(`Form response for ID ${targetFormId}:`, formRes.status);

    if (!formRes.ok) {
      const formError = await formRes.json();
      console.error("Kit form attachment failed:", formError);
      return NextResponse.json({ error: "Failed to add to form" }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // ACTION 4 — Live Free Google Sheet Sync Bypass
    // -------------------------------------------------------------------------
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
