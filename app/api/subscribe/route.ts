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

  const browserHeaders = {
    "Content-Type": "application/json",
    "X-Kit-Api-Key": apiKey,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    // ACTION 1 — Create or update subscriber custom fields profile
    const subscriberRes = await fetch("https://kit.com", {
      method: "POST",
      headers: browserHeaders,
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
      console.error("Kit profile update failed:", subscriberRes.status, errLog.substring(0, 300));
      return NextResponse.json({ error: "Failed to sync subscriber profile details" }, { status: 500 });
    }

    const kitFormUrl = "https://kit.com" + formId + "/subscribers";

    // ACTION 2 — Add subscriber to the baseline form using the body payload
    const formRes = await fetch(kitFormUrl, {
      method: "POST",
      headers: browserHeaders,
      body: JSON.stringify({
        email_address: email,
        first_name: firstName
      }),
    });

    if (!formRes.ok) {
      const formErr = await formRes.text();
      console.error("Kit form submission failed:", formRes.status, formErr.substring(0, 300));
      return NextResponse.json({ error: "Failed to map subscriber to target Kit Form structural pipeline" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Critical error in subscribe route:", err);
    return NextResponse.json({ error: "Server error handling subscription" }, { status: 500 });
  }
}
