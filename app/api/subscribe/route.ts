import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const { firstName, email, tier, neighborhood, bio, diasporaConcept, releaseIntent, pillars } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify your environmental variables are active
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
    console.error("Missing Supabase configuration environment keys.");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    // -------------------------------------------------------------------------
    // ACTION 1 — Log Application Data into Supabase
    // -------------------------------------------------------------------------
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey);
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
      console.error("Supabase engine error log:", supabaseError);
    }

    // -------------------------------------------------------------------------
    // ACTION 2 — Directly Subscribe to Form (Triggers Incentive Email Auto)
    // -------------------------------------------------------------------------
    // Using Kit's unified endpoint allows tracking data mappings cleanly in one trip
    const formRes = await fetch(
      `https://kit.com{process.env.KIT_FORM_ID}/subscribers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY!,
        },
        body: JSON.stringify({
          email_address: email,
          first_name: firstName,
          fields: {
            tier: tier || "collective" // Keeps custom parameters aligned for Liquid loops
          }
        }),
      }
    );

    const resText = await formRes.text();
    if (!formRes.ok) {
      console.error("Kit Form System Rejection Status:", formRes.status, resText);
      return NextResponse.json({ error: "Kit gateway transaction declined", details: resText }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error("System pipeline crash safety catch block triggered:", err);
    return NextResponse.json({ 
      error: "Server system crash mapping profiles", 
      details: err?.message || err 
    }, { status: 500 });
  }
}
