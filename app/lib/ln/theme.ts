// lib/ln/theme.ts
//
// An artist picks two colors; the ballot page needs a few more. This
// derives the rest so every artist's page keeps the same depth as Kay's
// original design. Safe to use in the browser.

export const DEFAULT_PRIMARY = "#6E1420";
export const DEFAULT_ACCENT = "#C81E3A";
export const CREAM = "#FBF3EC";
export const CREAM_DIM = "#F3E4DA";
export const INK = "#2A0E12";
export const GOLD = "#D8B667";

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(hex: string, target: string, amount: number): string {
  const a = rgb(hex);
  const b = rgb(target);
  return (
    "#" +
    a
      .map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export type BallotTheme = {
  primary: string; // header card, surfaces
  deep: string; // page background
  accent: string; // buttons, picked hearts
  accentSoft: string; // headline second line, button highlight
  border: string; // faint card outlines
};

export function ballotTheme(primary?: string | null, accent?: string | null): BallotTheme {
  const p = primary && /^#[0-9A-Fa-f]{6}$/.test(primary) ? primary.toUpperCase() : DEFAULT_PRIMARY;
  const a = accent && /^#[0-9A-Fa-f]{6}$/.test(accent) ? accent.toUpperCase() : DEFAULT_ACCENT;
  return {
    primary: p,
    deep: mix(p, "#000000", 0.33),
    accent: a,
    accentSoft: mix(a, "#FFFFFF", 0.25),
    border: `${mix(a, "#FFFFFF", 0.35)}55`,
  };
}
