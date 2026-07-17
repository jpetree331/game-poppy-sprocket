// src/lib/art.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// All art is embedded pixel arrays — nothing loaded from files, nothing
// ripped from anywhere. Sprites are authored as strings of hex palette
// indices ('0'–'f') with '.' for transparent, and decoded once at boot into
// number[][] grids (-1 = transparent). Canvas baking happens in render.ts;
// this module is pure data + decode.

import type { PaletteIndex } from "./palette.ts";

export type Pixel = PaletteIndex | -1;
export type SpriteGrid = Pixel[][];

export function decodeSprite(rows: readonly string[]): SpriteGrid {
  return rows.map((row) =>
    [...row].map((ch): Pixel => {
      if (ch === ".") return -1;
      const v = parseInt(ch, 16);
      if (Number.isNaN(v) || v > 15) throw new Error(`art: bad pixel char "${ch}"`);
      return v as PaletteIndex;
    }),
  );
}

// --- 16×16 terrain tiles -------------------------------------------------

// Murkk-7 bedrock: light gray face, dark gray cracks, black seams.
export const TILE_SOLID = decodeSprite([
  "8888888888888888",
  "8777777787777778",
  "8777777787777778",
  "8777787777777778",
  "8777777777778778",
  "8778777777777778",
  "8777777777777778",
  "8888888888888888",
  "7777877777777787",
  "7777877777777787",
  "7787777778777787",
  "7777777778777787",
  "7777777777777787",
  "7778777777777787",
  "7777777777877787",
  "8888888888888888",
]);

// Scrap-girder platform: brown plank, yellow rivets, only the top 6 rows
// exist — the rest is pass-through air (matches jump-through physics).
export const TILE_PLATFORM = decodeSprite([
  "6666666666666666",
  "6e66666e66666e66",
  "6666666666666666",
  "8686868686868686",
  ".8.8.8.8.8.8.8.8",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
]);

// Spikes: light-gray shards with white glints on black stubs.
export const TILE_SPIKE = decodeSprite([
  "................",
  "................",
  "................",
  "................",
  "...7........7...",
  "...7........7...",
  "..7f7......7f7..",
  "..777......777..",
  "..777......777..",
  ".77777....77777.",
  ".77777....77777.",
  "7777777..7777777",
  "7777777..7777777",
  "8888888888888888",
  "8888888888888888",
  "8888888888888888",
]);

// --- Poppy Sprocket, age 8¾ ------------------------------------------------
// Yellow hair, white face, light-blue junkyard overalls, dark boots. The
// boing frame shows the red boot spring. Feet sit on the bottom sprite row
// except the airborne poses. Right-facing; render bakes the mirror.

export const POPPY_IDLE = decodeSprite([
  "................",
  ".....eeeeee.....",
  "....eeeeeeee....",
  "....eeeeeeee....",
  ".....ffffff.....",
  ".....f0ff0f.....",
  ".....ffffff.....",
  "......ffff......",
  ".....999999.....",
  "....f999999f....",
  "....f999999f....",
  ".....999999.....",
  ".....99..99.....",
  ".....99..99.....",
  ".....88..88.....",
  "....888..888....",
]);

export const POPPY_RUN1 = decodeSprite([
  "................",
  ".....eeeeee.....",
  "....eeeeeeee....",
  "....eeeeeeee....",
  ".....ffffff.....",
  ".....f0ff0f.....",
  ".....ffffff.....",
  "......ffff......",
  ".....999999.....",
  "....f999999f....",
  "....f999999f....",
  ".....999999.....",
  "....99....99....",
  "...99......99...",
  "...88......88...",
  "..888......888..",
]);

export const POPPY_RUN2 = decodeSprite([
  "................",
  ".....eeeeee.....",
  "....eeeeeeee....",
  "....eeeeeeee....",
  ".....ffffff.....",
  ".....f0ff0f.....",
  ".....ffffff.....",
  "......ffff......",
  ".....999999.....",
  "....f999999f....",
  "....f999999f....",
  ".....999999.....",
  ".....99..99.....",
  "......9999......",
  "......8888......",
  ".....888888.....",
]);

export const POPPY_JUMP = decodeSprite([
  "................",
  ".....eeeeee.....",
  "....eeeeeeee....",
  "....eeeeeeee....",
  ".....ffffff.....",
  ".....f0ff0f.....",
  ".....ffffff.....",
  "...f..ffff..f...",
  "...f.999999.f...",
  ".....999999.....",
  ".....999999.....",
  ".....99..99.....",
  ".....9999.......",
  ".....8888.......",
  "....88..88......",
  "................",
]);

export const POPPY_BOING = decodeSprite([
  "................",
  ".....eeeeee.....",
  "....eeeeeeee....",
  "....eeeeeeee....",
  ".....ffffff.....",
  ".....f0ff0f.....",
  ".....ffffff.....",
  "......ffff......",
  ".....999999.....",
  "....f999999f....",
  ".....999999.....",
  ".....99..99.....",
  "......8888......",
  "......c44c......",
  ".......44.......",
  "......c44c......",
]);

// --- Critters ---------------------------------------------------------------

// Globbin: a cheerful light-green blob. Squishable.
export const GLOBBIN = decodeSprite([
  "................",
  "................",
  "................",
  "................",
  "......aaaa......",
  "....aaaaaaaa....",
  "...aaaaaaaaaa...",
  "...aa0aaaa0aa...",
  "...aaaaaaaaaa...",
  "..aaaaaaaaaaaa..",
  "..aaa2aaaa2aaa..",
  "..aaaaaaaaaaaa..",
  ".aaaaaaaaaaaaaa.",
  ".aa2aaaaaaaa2aa.",
  ".aaaaaaaaaaaaaa.",
  "..aaaaaaaaaaaa..",
]);

export const GLOBBIN_SQUISHED = decodeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".aaaaaaaaaaaaaa.",
  ".aaa0aaaaaa0aaa.",
  "aaaaaaaaaaaaaaaa",
]);

// Prickle-Pig: brown patroller with a ridge of gray quills. Lethal all over.
export const PRICKLE_PIG = decodeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...7.7.7.7.7....",
  "..76767676767...",
  "..666666666666..",
  ".66666666666666.",
  ".6666666666066c.",
  ".66666666666666.",
  ".66666666666666.",
  "..666666666666..",
  "..66..66..66....",
  "..66..66..66....",
]);

export const PRICKLE_PIG_WALK2 = decodeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...7.7.7.7.7....",
  "..76767676767...",
  "..666666666666..",
  ".66666666666666.",
  ".6666666666066c.",
  ".66666666666666.",
  ".66666666666666.",
  "..666666666666..",
  "...66..66..66...",
  "...66..66..66...",
]);

// Janitor-Bot: a tin sanitation robot with a cyan eye. Squishable (stomp
// disables); its soap bubbles are the real menace.
export const JANITOR_BOT = decodeSprite([
  "................",
  "................",
  ".......77.......",
  ".......77.......",
  "...88888888.....",
  "..8777777778....",
  "..87bb777778....",
  "..8777777778....",
  "..8778887778....",
  "..8777777778....",
  "...88888888.....",
  "....877778......",
  "....877778......",
  "...88888888.....",
  "....88..88......",
  "...888..888.....",
]);

export const JANITOR_BOT_SQUISHED = decodeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...88888888.....",
  "..8877bb7788....",
  ".888888888888...",
]);

// Soap bubble (8×8): light-cyan ring with a white glint.
export const BUBBLE = decodeSprite([
  "..bbbb..",
  ".b....b.",
  "b......b",
  "b..f...b",
  "b......b",
  "b......b",
  ".b....b.",
  "..bbbb..",
]);

// Exit door: a hatch from Poppy's rocket — cyan frame, dark interior,
// yellow wheel-handle.
export const TILE_EXIT = decodeSprite([
  "3333333333333333",
  "3bbbbbbbbbbbbbb3",
  "3b111111111111b3",
  "3b111111111111b3",
  "3b111111111111b3",
  "3b11111ee11111b3",
  "3b1111e11e1111b3",
  "3b1111e11e1111b3",
  "3b11111ee11111b3",
  "3b111111111111b3",
  "3b111111111111b3",
  "3b111111111111b3",
  "3b111111111111b3",
  "3b111111111111b3",
  "3bbbbbbbbbbbbbb3",
  "3333333333333333",
]);
