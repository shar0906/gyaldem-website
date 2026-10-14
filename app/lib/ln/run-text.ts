// lib/ln/run-text.ts
//
// The running order as admins type it: one item per line, with an
// optional 24-hour time in front ("21:30 Bingo, round 1").

import type { RunItem } from "./shows";

export function runToText(items: RunItem[] | null | undefined): string {
  return (items ?? []).map((i) => `${i.time ? `${i.time} ` : ""}${i.label}`).join("\n");
}

export function textToRun(text: string): RunItem[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
      return m ? { time: `${m[1].padStart(2, "0")}:${m[2]}`, label: m[3].trim() } : { time: null, label: l };
    });
}

export const RUN_PLACEHOLDER = "20:00 Doors and dinner\n21:30 Bingo, round 1\n22:00 Bingo, round 2\n22:30 DJ set\n23:45 Last call";
