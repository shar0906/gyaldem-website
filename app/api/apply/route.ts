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
    // ACTION 1 — Update Profile Details in Supabase
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // ACTION 2 — Update Existing Subscriber Details in Kit Natively
    // -------------------------------------------------------------------------
    // Kit's subscribers endpoint safely upserts custom fields if the email exists
    const subscriberRes = await fetch("https://kit.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": process.env.KIT_API_KEY!,
      },
      body: JSON.stringify({
        email_address: email,
        first_name: firstName,
        // Keeps them active if they already confirmed via email
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
      console.error("Kit profile details update failed:", errText);
      // We don't crash the whole response here so your core DB logs still save safely
    }

    // -------------------------------------------------------------------------
    // ACTION 3 — Live Free Google Sheet Sync Backup
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
    console.error("Apply form submission error:", err);
    return NextResponse.json({ error: "Server error saving application" }, { status: 500 });
  }
}
