// src/lib/palette.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// The 16-color EGA palette, hard-locked. The palette is a hardware spec
// (IBM EGA, 1984), not anyone's IP. These 16 hex literals — mirrored once in
// src/tokens.css — are the ONLY hex color literals permitted in the repo.
// All other code passes PaletteIndex values, never color strings.

export const PALETTE = [
  "#000000", // 0  black
  "#0000AA", // 1  blue
  "#00AA00", // 2  green
  "#00AAAA", // 3  cyan
  "#AA0000", // 4  red
  "#AA00AA", // 5  magenta
  "#AA5500", // 6  brown
  "#AAAAAA", // 7  light gray
  "#555555", // 8  dark gray
  "#5555FF", // 9  light blue
  "#55FF55", // 10 light green
  "#55FFFF", // 11 light cyan
  "#FF5555", // 12 light red
  "#FF55FF", // 13 light magenta
  "#FFFF55", // 14 yellow
  "#FFFFFF", // 15 white
] as const;

export type PaletteIndex =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

// Named indices for readable sprite/render code.
export const EGA = {
  black: 0,
  blue: 1,
  green: 2,
  cyan: 3,
  red: 4,
  magenta: 5,
  brown: 6,
  lightGray: 7,
  darkGray: 8,
  lightBlue: 9,
  lightGreen: 10,
  lightCyan: 11,
  lightRed: 12,
  lightMagenta: 13,
  yellow: 14,
  white: 15,
} as const satisfies Record<string, PaletteIndex>;

export function colorOf(index: PaletteIndex): string {
  return PALETTE[index];
}
