import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();

    const nameMatch = html.match(/<title>(.*?)<\/title>/i);
    const imageMatch = html.match(/og:image.*?content="(.*?)"/i);
    const descMatch = html.match(/og:description.*?content="(.*?)"/i);

    return NextResponse.json({
      name: nameMatch?.[1]?.replace(" | Luma", "").trim() || null,
      flyer_url: imageMatch?.[1] || null,
      description: descMatch?.[1] || null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}