import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

const categories = [
  "ladies-night",
  "gyalentines",
  "community",
  "cultural-experiences",
  "the-salons",
  "the-balance",
];

export async function GET() {
  const gallery: Record<string, { url: string; caption: string | null; external_link: string | null; external_link_label: string | null; is_cover: boolean }[]> = {};

  for (const category of categories) {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("url, caption, external_link, external_link_label, is_cover")
      .eq("category", category)
      .order("is_cover", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) {
      gallery[category] = [];
      continue;
    }

    gallery[category] = data;
  }

  return NextResponse.json(gallery);
}