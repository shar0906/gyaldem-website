import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 🛠️ Safety check for build environment variables
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
    console.error("Missing Supabase configuration environment keys.");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    // ⚡ Initialize client dynamically to satisfy build pipeline rules
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey
    );

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
          pillars: pillars || []
        },
        { onConflict: "email" }
      );

    if (supabaseError) {
      console.error("Supabase storage error:", supabaseError);
    }

    // -------------------------------------------------------------------------
    // ACTION 2 — Create or update subscriber profile in Kit V4 API
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
        fields: {
          tier: tier || "collective"
        }
      }),
    });

    // ⚡ Safe text inspection to prevent parser crashes
    const subscriberText = await subscriberRes.text();
    if (!subscriberRes.ok) {
      console.error("Kit API Subscriber Error status:", subscriberRes.status, subscriberText);
      return NextResponse.json({ error: "Kit subscriber registration rejected", details: subscriberText }, { status: 500 });
    }

    const subscriberData = JSON.parse(subscriberText);
    const subscriberId = subscriberData.subscriber?.id;
    if (!subscriberId) {
      return NextResponse.json({ error: "No subscriber profile ID returned from Kit" }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // ACTION 3 — Associate profile with Kit main form sequence
    // -------------------------------------------------------------------------
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

    const formText = await formRes.text();
    if (!formRes.ok) {
      console.error("Kit API Form Association Error status:", formRes.status, formText);
      return NextResponse.json({ error: "Kit form assignment rejected", details: formText }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Critical server error catch:", err);
    return NextResponse.json({ 
      error: "Server system crash mapping profiles", 
      details: err?.message || err 
    }, { status: 500 });
  }
}
