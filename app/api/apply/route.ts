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
        const { error: sbError } = await supabase
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
          
        if (sbError) console.error("Supabase upsert internal error logs:", sbError);
      } catch (sbCatch) {
        console.error("Supabase connection execution failed gracefully:", sbCatch);
      }
    }

    // ACTION 2 — Create or update comprehensive custom fields profile inside Kit v4
    if (!process.env.KIT_API_KEY) {
      console.error("Missing KIT_API_KEY inside system environment configuration.");
      return NextResponse.json({ error: "Server configurations missing structural dependencies" }, { status: 500 });
    }

    const subscriberRes = await fetch("https://kit.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": process.env.KIT_API_KEY,
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

    if (!subscriberRes.ok) {
      const errText = await subscriberRes.text();
      console.error("Kit detailed profile setup failed parameters:", subscriberRes.status, errText);
    }

    // ACTION 2b — Add application track to its standalone dedicated form endpoint
    if (process.env.KIT_MEMBERSHIP_FORM_ID) {
      const formRes = await fetch(
        `https://kit.com{process.env.KIT_MEMBERSHIP_FORM_ID}/subscribers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kit-Api-Key": process.env.KIT_API_KEY,
          },
          body: JSON.stringify({
            email_address: email,
            first_name: firstName
          }),
        }
      );
      
      if (!formRes.ok) {
        const formErr = await formRes.text();
        console.error("Kit membership form placement endpoint failed execution:", formRes.status, formErr);
      }
    } else {
      console.error("Warning: KIT_MEMBERSHIP_FORM_ID is missing from environment layout parameters.");
    }

    // ACTION 3 — Live Free Google Sheet Sync Backup execution sequence
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
      }).catch((err) => console.error("Google Sheets fallback capture sequence exception:", err));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Apply form sequence global catch event thrown:", err);
    return NextResponse.json({ error: "Server processing exception caught completely" }, { status: 500 });
  }
}