import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // ACTION 1 — Update Profile Details in Supabase
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey);
      
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

    // ACTION 2 — Create or update subscriber profile with complete payload
    const subscriberRes = await fetch("https://kit.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": process.env.KIT_API_KEY!,
      },
      body: JSON.stringify({
        email_address: email,
        first_name: firstName,
        state: "inactive",
        fields: {
          tier: tier || "collective",
          neighborhood: neighborhood || "",
          bio: bio || "",
          diaspora_concept: diasporaConcept || "",
          release_intent: releaseIntent || "",
          pillars: pillars ? pillars.join(", ") : ""
        }
      }),
    });

    const subscriberData = await subscriberRes.json();
    
    if (!subscriberRes.ok) {
      console.error("Kit apply subscriber profile update failed:", subscriberData);
    } else {
      const subscriberId = subscriberData.subscriber?.id;
      
      // ACTION 2b — Add applicant directly to your dedicated Membership/Ambassador Form ID
      if (subscriberId && process.env.KIT_MEMBERSHIP_FORM_ID) {
        const formRes = await fetch(
          `https://kit.com{process.env.KIT_MEMBERSHIP_FORM_ID}/subscribers/${subscriberId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Kit-Api-Key": process.env.KIT_API_KEY!,
            },
          }
        );
        if (!formRes.ok) {
          const formErr = await formRes.text();
          console.error("Kit tracking form subscription failed for apply track:", formErr);
        }
      }
    }

    // ACTION 3 — Live Free Google Sheet Sync Backup
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
    console.error("Apply form submission error:", err);
    return NextResponse.json({ error: "Server error saving application" }, { status: 500 });
  }
}
