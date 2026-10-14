// lib/ln/staff-show.ts
//
// Show-night screens (door, host console) work on one of tonight's
// shows. A login limited to one series only ever sees its own; everyone
// else picks from tonight's shows when there's more than one.

import type { SupabaseClient } from "@supabase/supabase-js";
import { seriesScope, StaffUser } from "../admin/staff-auth";
import { pickTonightShow, TonightShow, tonightLabel } from "./tonight";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readShowId(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v) ? v : null;
}

export async function staffTonight(
  db: SupabaseClient,
  user: StaffUser,
  showId: unknown
): Promise<{ current: TonightShow | null; options: { id: string; label: string }[] }> {
  const { current, all } = await pickTonightShow(db, { seriesId: seriesScope(user), showId: readShowId(showId) });
  return { current, options: all.map((t) => ({ id: t.show.id, label: tonightLabel(t) })) };
}
