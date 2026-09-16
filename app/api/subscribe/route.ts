import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Destructure 'tier' along with firstName and email
  const { firstName, email, tier } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // Step 1 — Create or update subscriber with custom field mapping
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

    // Step 2 — Add subscriber to form
    const formRes = await fetch(
      `https://kit.com{process.env.KIT_MAILING_FORM_ID}/subscribers/${subscriberId}`,
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
