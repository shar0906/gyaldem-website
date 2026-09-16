import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Destructure all parameters coming from the /apply page or public landing pages
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // -------------------------------------------------------------------------
    // ACTION 1 — Inject into Supabase Applications Database Table
    // (Safely wrapped so it never crashes your "npm run build" checks)
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
            pillars: pillars || [] // Logs your array questions cleanly
          },
          { onConflict: "email" } // Safely overwrites if the email already exists
        );
    }

    // -------------------------------------------------------------------------
    // ACTION 2 — Your exact working Kit subscriber creation code
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
        state: "inactive",
        send_incentive: true, 
        fields: {
          tier: tier || "collective" // Fallback to general if undefined
        }
      }),
    });

    const subscriberData = await subscriberRes.json();
    console.log("Subscriber response:", subscriberRes.status, JSON.stringify(subscriberData));

    if (!subscriberRes.ok) {
      return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
    }

    const subscriberId = subscriberData.subscriber?.id;

    if (!subscriberId) {
      return NextResponse.json({ error: "No subscriber ID returned" }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // ACTION 3 — Add subscriber to the correct form path (Dynamic Routing)
    // -------------------------------------------------------------------------
    // ⚡ Routes dynamically: if 'mailing' use your original KIT_MAILING_FORM_ID, otherwise use the membership ID
    const targetFormId = (tier === "mailing") 
      ? process.env.KIT_MAILING_FORM_ID 
      : process.env.KIT_MEMBERSHIP_FORM_ID;

    if (!targetFormId) {
      console.error("Missing targeting configuration for Kit form mapping. Check form variables.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
