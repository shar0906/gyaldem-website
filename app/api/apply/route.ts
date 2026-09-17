import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars, agreedToUnderstanding } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!agreedToUnderstanding) {
    return NextResponse.json({ error: "Agreement to The Understanding is required" }, { status: 400 });
  }

  try {
    // ACTION 1 — Update Profile Details in Supabase safely
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
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
              pillars: pillars || [],
              agreed_to_understanding: agreedToUnderstanding || false
            },
            { onConflict: "email" }
          );
      } catch (sbCatch) {
        console.error("Supabase storage step bypassed gracefully:", sbCatch);
      }
    }

    // ACTION 2 — Submit to Kit using the public V3 Form gateway layer
    const membershipFormId = process.env.KIT_MEMBERSHIP_FORM_ID || process.env.kit_membership_form_id;
    const apiKey = process.env.KIT_API_KEY || process.env.kit_api_key;

    if (membershipFormId && apiKey) {
      const totalUrl = "https://api.convertkit.com/v3/forms/" + membershipFormId + "/subscribe";
      
      const formRes = await fetch(totalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          email: email,
          first_name: firstName,
          fields: {
            tier: tier || "collective",
            neighborhood: neighborhood || "",
            bio: bio || "",
            diaspora_concept: diasporaConcept || "",
            release_intent: releaseIntent || "",
            pillars: pillars ? pillars.join(", ") : "",
            agreed_to_understanding: agreedToUnderstanding ? "yes" : "no"
          }
        }),
      });

      if (!formRes.ok) {
        const errText = await formRes.text();
        console.error("Kit legacy pipeline failed for application track:", formRes.status, errText.substring(0, 200));
      }
    } else {
      console.error("CRITICAL: KIT_MEMBERSHIP_FORM_ID environment variable is missing in setup metrics.");
    }

    // ACTION 3 — Google Sheet Sync Backup Execution
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
          pillars,
          agreedToUnderstanding
        }),
      }).catch((err) => console.error("Sheets fallback bypassed:", err));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Apply route critical failure event:", err);
    return NextResponse.json({ error: "Server processing exception caught" }, { status: 500 });
  }
}