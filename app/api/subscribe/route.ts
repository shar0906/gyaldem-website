import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const formId = process.env.KIT_FORM_ID;
  const apiKey = process.env.KIT_API_KEY;

  if (!formId || !apiKey) {
    console.error("CRITICAL: Missing KIT_FORM_ID or KIT_API_KEY in environment variables.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // ACTION 1 — Create or update subscriber custom fields profile
    const subscriberRes = await fetch("https://kit.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
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

    if (!subscriberRes.ok) {
      const errLog = await subscriberRes.text();
      console.error("Kit profile update failed:", subscriberRes.status, errLog);
      return NextResponse.json({ error: "Failed to sync subscriber profile details" }, { status: 500 });
    }

    // Explicitly isolated clean URL layout string to prevent string interpolation errors
    const kitFormUrl = "https://kit.com" + formId + "/subscribers";

    // ACTION 2 — Add subscriber to the baseline form using the body payload
    const formRes = await fetch(kitFormUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: JSON.stringify({
        email_address: email,
        first_name: firstName
      }),
    });

    if (!formRes.ok) {
      const formErr = await formRes.text();
      console.error("Kit form submission failed:", formRes.status, formErr);
      return NextResponse.json({ error: "Failed to map subscriber to target Kit Form structural pipeline" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Critical error in subscribe route:", err);
    return NextResponse.json({ error: "Server error handling subscription" }, { status: 500 });
  }
}
