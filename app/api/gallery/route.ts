import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

const categories = [
  "ladies-night",
  "gyalentines",
  "community",
  "cultural-experiences",
];

export async function GET() {
  const gallery: Record<string, { url: string; caption: string | null }[]> = {};

  for (const category of categories) {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("url, caption")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error || !data) {
      gallery[category] = [];
      continue;
    }

    gallery[category] = data;
  }

  return NextResponse.json(gallery);
}