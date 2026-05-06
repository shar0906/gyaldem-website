import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { firstName, email } = await req.json();

  if (!firstName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Kit API integration goes here once you have your API key
  // For now we log and return success so the form works
  console.log("New subscriber:", firstName, email);

  return NextResponse.json({ success: true }, { status: 200 });
}