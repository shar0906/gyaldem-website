import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { firstName, email } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const url = `https://api.kit.com/v4/forms/${process.env.KIT_FORM_ID}/subscribers`;
    
    console.log("Kit URL:", url);
    console.log("Kit API Key exists:", !!process.env.KIT_API_KEY);
    console.log("Kit Form ID:", process.env.KIT_FORM_ID);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": process.env.KIT_API_KEY!,
      },
      body: JSON.stringify({
        email_address: email,
        first_name: firstName,
      }),
    });

    const data = await res.json();
    console.log("Kit response status:", res.status);
    console.log("Kit response:", JSON.stringify(data));

    if (!res.ok) {
      return NextResponse.json({ error: "Kit API error" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}