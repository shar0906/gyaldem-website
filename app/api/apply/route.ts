import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
              pillars: pillars || []
            },
            { onConflict: "email" }
          );
      } catch (sbCatch) {
        console.error("Supabase storage step bypassed gracefully:", sbCatch);
      }
    }

    // ACTION 2 — Submit to Kit using isolated string logic
    const membershipFormId = process.env.KIT_MEMBERSHIP_FORM_ID;
    const apiKey = process.env.KIT_API_KEY;

    if (membershipFormId && apiKey) {
      const baseDomain = "https://convertkit.com";
      const pathSegment = "/v3/forms/";
      const actionSegment = "/subscribe";
      const totalUrl = baseDomain + pathSegment + membershipFormId + actionSegment;
      
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
            pillars: pillars ? pillars.join(", ") : ""
          }
        }),
      });

      if (!formRes.ok) {
        const errText = await formRes.text();
        console.error("Kit legacy pipeline failed for application track:", formRes.status, errText.substring(0, 200));
      }
    } else {
      console.error("Missing structural Kit environmental setup metrics.");
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
          pillars
        }),
      }).catch((err) => console.error("Sheets fallback bypassed:", err));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Apply route critical failure event:", err);
    return NextResponse.json({ error: "Server processing exception caught" }, { status: 500 });
  }
}
