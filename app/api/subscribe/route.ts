import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Initialize the secure server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // -------------------------------------------------------------------------
    // ACTION 1 — Insert into Supabase Applications Database Table
    // -------------------------------------------------------------------------
    const { error: supabaseError } = await supabase
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
          pillars: pillars || [] // Saves directly as a clean native database array
        },
        { onConflict: "email" } // If they submit again, it safely overwrites their file
      );

    if (supabaseError) {
      console.error("Supabase storage error:", supabaseError);
      // We don't return early here so that the Kit email pipeline has a fallback chance to trigger
    }

    // -------------------------------------------------------------------------
    // ACTION 2 — Create or update subscriber profile in Kit
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
        state: "inactive", // Triggers confirmation email loop
        send_incentive: true,
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
      console.error("Kit mapping failure:", subscriberData);
      return NextResponse.json({ error: "Failed to map subscriber profile" }, { status: 500 });
    }

    const subscriberId = subscriberData.subscriber?.id;
    if (!subscriberId) {
      return NextResponse.json({ error: "No system index returned" }, { status: 500 });
    }

    // ACTION 3 — Associate profile with Kit main form sequence
    const formRes = await fetch(
      `https://kit.com{process.env.KIT_FORM_ID}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY!,
        },
      }
    );

    if (!formRes.ok) {
      console.error("Kit form attachment error");
      return NextResponse.json({ error: "Failed to bind profile to form node" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Critical server error catch:", err);
    return NextResponse.json({ error: "Server system crash mapping profiles" }, { status: 500 });
  }
}
