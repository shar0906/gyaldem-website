import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const categories = ["ladies-night", "gyalentines", "community", "cultural-experiences"];

export const dynamic = "force-dynamic";

export async function GET() {
  const gallery: Record<string, string[]> = {};

  for (const category of categories) {
    const dir = path.join(process.cwd(), "public", "gallery", category);
    try {
      const files = fs.readdirSync(dir).filter((f) =>
        [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(f).toLowerCase())
      );
      gallery[category] = files.map((f) => `/gallery/${category}/${f}`);
    } catch {
      gallery[category] = [];
    }
  }

  return NextResponse.json(gallery);
}