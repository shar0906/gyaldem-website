import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ⚡ ONLY destructure what the landing page banner/popup inputs capture
  const { firstName, email, tier } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // -------------------------------------------------------------------------
    // ACTION 1 — Create or update basic subscriber profile in Kit V4 API
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
        state: "inactive", // Forces verification template email triggers
        send_incentive: true, 
        fields: {
          tier: tier || "collective" 
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
    // ACTION 2 — Add subscriber to the correct dynamic form path
    // -------------------------------------------------------------------------
    const targetFormId = (tier === "mailing") 
      ? process.env.KIT_MAILING_FORM_ID 
      : process.env.KIT_MEMBERSHIP_FORM_ID;

    if (!targetFormId) {
      console.error("Missing targeting configuration for Kit form mapping.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const formRes = await fetch(
      `https://kit.com{targetFormId}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY!,
        },
      }
    );

    console.log(`Form response for ID ${targetFormId}:`, formRes.status);

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
