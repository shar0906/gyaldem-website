import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categories = [
  "ladies-night",
  "gyalentines",
  "community",
  "cultural-experiences",
];

export async function GET() {
  const gallery: Record<string, string[]> = {};

  for (const category of categories) {
    const { data, error } = await supabase.storage
      .from("gallery-photos")
      .list(category, { sortBy: { column: "created_at", order: "desc" } });

    if (error || !data) {
      gallery[category] = [];
      continue;
    }

    gallery[category] = data
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => supabase.storage
        .from("gallery-photos")
        .getPublicUrl(`${category}/${f.name}`).data.publicUrl
      );
  }

  return NextResponse.json(gallery);
}