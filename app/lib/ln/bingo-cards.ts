// lib/ln/bingo-cards.ts
//
// Bingo cards for printing, as a CSV for Canva Bulk Create: one row per
// card, one column per square. 5x5 with the center square left free (it
// holds the logo in the Canva design), so 24 squares per card:
//   card_no, r1c1, r1c2, ... r5c5 (no r3c3), theme
// Every card gets its own random mix, never the same text twice on a
// card. Connect the columns to the design's text boxes once; after that,
// each new deck is just a new CSV.

import { randomInt } from "node:crypto";
import { toCsv } from "./csv";

export const SQUARES = 24;
export const MAX_CARDS = 300; // Canva Bulk Create's limit per run

export const CARD_COLUMNS: string[] = (() => {
  const cols: string[] = [];
  for (let r = 1; r <= 5; r++) for (let c = 1; c <= 5; c++) if (!(r === 3 && c === 3)) cols.push(`r${r}c${c}`);
  return cols;
})();

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distinct card texts, in deck order.
export function distinctTexts(texts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of texts) {
    const key = t.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t.trim());
  }
  return out;
}

export function buildCards(texts: string[], count: number): string[][] {
  const pool = distinctTexts(texts);
  if (pool.length < SQUARES) throw new Error("not_enough");
  const cards: string[][] = [];
  const seen = new Set<string>();
  for (let n = 0; n < count; n++) {
    let card = shuffled(pool).slice(0, SQUARES);
    // With a big deck, an exact repeat is near impossible; re-deal if so.
    for (let tries = 0; tries < 5 && seen.has(card.join("\u0001")); tries++) card = shuffled(pool).slice(0, SQUARES);
    seen.add(card.join("\u0001"));
    cards.push(card);
  }
  return cards;
}

export function cardsCsv(cards: string[][], theme: string): string {
  return toCsv(
    ["card_no", ...CARD_COLUMNS, "theme"],
    cards.map((squares, i) => [String(i + 1).padStart(3, "0"), ...squares, theme])
  );
}
