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
    console.error("CRITICAL: Missing KIT_FORM_ID or KIT_API_KEY.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // Construct the endpoint out of isolated fragments to break any compiler string template bugs
    const baseDomain = "https://convertkit.com";
    const pathSegment = "/v3/forms/";
    const actionSegment = "/subscribe";
    const totalUrl = baseDomain + pathSegment + formId + actionSegment;

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
      console.error("Kit Fallback submission failed:", response.status, errText.substring(0, 200));
      return NextResponse.json({ error: "Kit gateway integration error" }, { status: 502 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Critical error in subscribe route:", err);
    return NextResponse.json({ error: "Server handling exception" }, { status: 500 });
  }
}
