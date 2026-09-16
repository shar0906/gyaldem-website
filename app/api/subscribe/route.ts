import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!process.env.KIT_FORM_ID || !process.env.KIT_API_KEY) {
    console.error("CRITICAL: Missing KIT_FORM_ID or KIT_API_KEY in environment variables.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // Direct action: Add the user to the form pipeline immediately
    const formRes = await fetch(
      `https://kit.com{process.env.KIT_FORM_ID}/subscribers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": process.env.KIT_API_KEY,
        },
        body: JSON.stringify({
          email_address: email,
          first_name: firstName
        }),
      }
    );

    if (!formRes.ok) {
      const formErr = await formRes.text();
      console.error("Kit form subscription pipeline failed:", formRes.status, formErr);
      return NextResponse.json({ error: "Failed to map user to Kit Form structure" }, { status: 502 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Critical exception caught inside subscribe route:", err);
    return NextResponse.json({ error: "Server error handling submission sequence" }, { status: 500 });
  }
}
