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
    // ACTION 3 — Your exact working Kit form assignment code
    // -------------------------------------------------------------------------
    const formRes = await fetch(
      `https://api.kit.com/v4/forms/${process.env.KIT_FORM_ID}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY!,
        },
      }
    );

    console.log("Form response:", formRes.status);

    if (!formRes.ok) {
      const formError = await formRes.json();
      console.error("Form error:", formError);
      return NextResponse.json({ error: "Failed to add to form" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
