import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // -------------------------------------------------------------------------
    // ACTION 1 — Create or update subscriber profile in Kit V4 API
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
        state: "inactive",
        send_incentive: true, 
        fields: {
          tier: tier || "collective" 
        }
      }),
    });

    const subscriberData = await subscriberRes.json();

    if (!subscriberRes.ok) {
      return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 });
    }

    const subscriberId = subscriberData.subscriber?.id;

    if (!subscriberId) {
      return NextResponse.json({ error: "No subscriber ID returned" }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // ACTION 2 — Add subscriber directly to your baseline original form ID
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

    if (!formRes.ok) {
      return NextResponse.json({ error: "Failed to add to form" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}