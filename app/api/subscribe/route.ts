import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email, tier } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Accepts both lowercase and uppercase environment variable layouts from Railway
  const formId = process.env.KIT_FORM_ID || process.env.kit_form_id;
  const apiKey = process.env.KIT_API_KEY || process.env.kit_api_key;

  if (!formId || !apiKey) {
    console.error("CRITICAL CONFIG ERROR: Form ID or API Key is completely missing in Railway environment variables.");
    return NextResponse.json({ error: "Server environmental configuration error" }, { status: 500 });
  }

  try {
    // Explicitly safe v3 structural layout path parameters
    const totalUrl = "https://api.convertkit.com/v3/forms/" + formId + "/subscribe";

    const response = await fetch(totalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        email: email,
        first_name: firstName,
        fields: {
          tier: tier || "collective"
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Kit API Gateway Pipeline Failed:", response.status, errText.substring(0, 200));
      return NextResponse.json({ error: "Kit integration endpoint failure" }, { status: 502 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Critical error in subscribe route:", err);
    return NextResponse.json({ error: "Server handling exception" }, { status: 500 });
  }
}