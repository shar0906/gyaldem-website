// admin/ladies-night/useShows.ts
//
// The show list for pickers on Guests and Results, labeled by date and
// artist. Starts on the soonest upcoming show, or the latest past one.

"use client";

import { useEffect, useState } from "react";
import { api, errorText } from "./kit";

export type ShowOption = {
  id: string;
  event_date: string;
  archived: boolean;
  stage: string;
  artist: { display_name: string } | null;
};

export function useShows() {
  const [shows, setShows] = useState<ShowOption[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api<{ shows: ShowOption[] }>("/api/admin/ladies-night/shows");
      if (!res.ok) {
        setError(errorText(res.data as { error?: string }));
        return;
      }
      const list = res.data.shows.filter((s) => !s.archived);
      setShows(list);
      setSelected(list[0]?.id ?? null);
    })();
  }, []);

  return { shows, selected, setSelected, error };
}
