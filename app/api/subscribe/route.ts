import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Fail early if environment variables are missing
  if (!process.env.KIT_FORM_ID || !process.env.KIT_API_KEY) {
    console.error("CRITICAL: Missing KIT_FORM_ID or KIT_API_KEY in environment variables.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // ACTION 1 — Create or update subscriber profile
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
          tier: tier || "collective" 
        }
      }),
    });

    // Check if the response is HTML instead of JSON
    const contentType = subscriberRes.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const htmlError = await subscriberRes.text();
      console.error("Kit API returned non-JSON response (Subscribers Endpoint):", htmlError);
      return NextResponse.json({ error: "Kit API returned an invalid HTML response" }, { status: 502 });
    }

    const subscriberData = await subscriberRes.json();

    if (!subscriberRes.ok) {
      console.error("Kit subscriber creation failed:", subscriberData);
      return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
    }

    const subscriberId = subscriberData.subscriber?.id;

    if (!subscriberId) {
      return NextResponse.json({ error: "No subscriber ID returned from Kit" }, { status: 500 });
    }

    // ACTION 2 — Add subscriber directly to form ID
    const formRes = await fetch(
      `https://kit.com{process.env.KIT_FORM_ID}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY,
        },
      }
    );

    if (!formRes.ok) {
      const formErr = await formRes.text();
      console.error("Kit form subscription failed:", formErr);
      return NextResponse.json({ error: "Failed to add to form" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe route catch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
