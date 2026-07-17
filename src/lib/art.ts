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

// --- Items + locked door ----------------------------------------------------

// Locked door: riveted metal slab with a red key slot. Blocks like solid
// until a keycard consumes it.
export const TILE_DOOR = decodeSprite([
  "8888888888888888",
  "8777777777777778",
  "8788888888888878",
  "8787777777777878",
  "8787777777777878",
  "8787777447777878",
  "8787774444777878",
  "8787774444777878",
  "8787777447777878",
  "8787777777777878",
  "8787777777777878",
  "8787777777777878",
  "8787777777777878",
  "8788888888888878",
  "8777777777777778",
  "8888888888888888",
]);

// Soda cap (8×8): 100 points of fizzy treasure.
export const SODA_CAP = decodeSprite([
  "..8888..",
  ".8eeee8.",
  "8eeeeee8",
  "8ee66ee8",
  "8ee66ee8",
  "8eeeeee8",
  ".8eeee8.",
  "..8888..",
]);

// Keycard (8×8 world sprite + HUD icon): cyan chip, white contact.
export const KEYCARD = decodeSprite([
  "........",
  "bbbbbbb.",
  "b33333b.",
  "b3ff33b.",
  "b3ff33b.",
  "b33333b.",
  "bbbbbbb.",
  "........",
]);

// --- The four ship parts (16×16, each with its own silhouette) --------------

// 1: Sputter Coil — copper cylinder, yellow windings.
export const PART_SPUTTER_COIL = decodeSprite([
  "................",
  "................",
  "....77....77....",
  "....7777777.....",
  "...866666668....",
  "...6e6e6e6e6....",
  "...66666666e....",
  "...6e6e6e6e6....",
  "...66666666e....",
  "...6e6e6e6e6....",
  "...866666668....",
  "....7777777.....",
  "....77....77....",
  "................",
  "................",
  "................",
]);

// 2: Fizz Tank — cyan pressure bottle, white cap, bubbles inside.
export const PART_FIZZ_TANK = decodeSprite([
  "................",
  "......ffff......",
  "......7777......",
  "....33333333....",
  "...3333333333...",
  "...33b3333b33...",
  "...3333b33333...",
  "...33333333b3...",
  "...3b33333333...",
  "...333333b333...",
  "...3333333333...",
  "...3333333333...",
  "....33333333....",
  "......7777......",
  "................",
  "................",
]);

// 3: Left Fin — swept red stabilizer fin.
export const PART_LEFT_FIN = decodeSprite([
  "................",
  "............cc..",
  "...........ccc..",
  "..........cccc..",
  ".........ccccc..",
  "........cc4ccc..",
  ".......cc44ccc..",
  "......cc444ccc..",
  ".....cc4444ccc..",
  "....cc44444ccc..",
  "...cc444444ccc..",
  "..cccccccccccc..",
  "..cccccccccccc..",
  "....88....88....",
  "................",
  "................",
]);

// 4: Big Red Button — exactly what it says, on a gray housing.
export const PART_BIG_RED_BUTTON = decodeSprite([
  "................",
  "................",
  "................",
  "......cccc......",
  "....cccccccc....",
  "...cccc44cccc...",
  "...ccc4444ccc...",
  "...cc444444cc...",
  "...4444444444...",
  "..777777777777..",
  "..788888888887..",
  "..788888888887..",
  "..777777777777..",
  "................",
  "................",
  "................",
]);

// Two-frame sparkle overlay drawn on top of uncollected ship parts.
export const SPARKLE_A = decodeSprite([
  "f...............",
  "................",
  "..............f.",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".f..............",
  "................",
  "................",
  "................",
  "..............f.",
  "................",
]);

export const SPARKLE_B = decodeSprite([
  "................",
  "........f.......",
  "................",
  "................",
  "..f.............",
  "................",
  "................",
  ".............f..",
  "................",
  "................",
  "................",
  "....f...........",
  "................",
  "................",
  "................",
  "................",
]);

// --- HUD bits ----------------------------------------------------------------

// 3×5 digits for score/lives readouts.
export const DIGITS = [
  ["fff", "f.f", "f.f", "f.f", "fff"], // 0
  [".f.", "ff.", ".f.", ".f.", "fff"], // 1
  ["fff", "..f", "fff", "f..", "fff"], // 2
  ["fff", "..f", "fff", "..f", "fff"], // 3
  ["f.f", "f.f", "fff", "..f", "..f"], // 4
  ["fff", "f..", "fff", "..f", "fff"], // 5
  ["fff", "f..", "fff", "f.f", "fff"], // 6
  ["fff", "..f", "..f", "..f", "..f"], // 7
  ["fff", "f.f", "fff", "f.f", "fff"], // 8
  ["fff", "f.f", "fff", "..f", "fff"], // 9
].map(decodeSprite);

// 3×5 uppercase letters + a little punctuation, same format as DIGITS.
// This is the game's entire typeface — no browser fonts anywhere in play.
export const FONT: Record<string, SpriteGrid> = Object.fromEntries(
  Object.entries({
    A: ["fff", "f.f", "fff", "f.f", "f.f"],
    B: ["ff.", "f.f", "ff.", "f.f", "ff."],
    C: ["fff", "f..", "f..", "f..", "fff"],
    D: ["ff.", "f.f", "f.f", "f.f", "ff."],
    E: ["fff", "f..", "ff.", "f..", "fff"],
    F: ["fff", "f..", "ff.", "f..", "f.."],
    G: ["fff", "f..", "f.f", "f.f", "fff"],
    H: ["f.f", "f.f", "fff", "f.f", "f.f"],
    I: ["fff", ".f.", ".f.", ".f.", "fff"],
    J: ["..f", "..f", "..f", "f.f", "fff"],
    K: ["f.f", "ff.", "f..", "ff.", "f.f"],
    L: ["f..", "f..", "f..", "f..", "fff"],
    M: ["f.f", "fff", "f.f", "f.f", "f.f"],
    N: ["ff.", "f.f", "f.f", "f.f", "f.f"],
    O: ["fff", "f.f", "f.f", "f.f", "fff"],
    P: ["fff", "f.f", "fff", "f..", "f.."],
    Q: ["fff", "f.f", "f.f", "fff", "..f"],
    R: ["ff.", "f.f", "ff.", "f.f", "f.f"],
    S: ["fff", "f..", "fff", "..f", "fff"],
    T: ["fff", ".f.", ".f.", ".f.", ".f."],
    U: ["f.f", "f.f", "f.f", "f.f", "fff"],
    V: ["f.f", "f.f", "f.f", "f.f", ".f."],
    W: ["f.f", "f.f", "f.f", "fff", "f.f"],
    X: ["f.f", "f.f", ".f.", "f.f", "f.f"],
    Y: ["f.f", "f.f", ".f.", ".f.", ".f."],
    Z: ["fff", "..f", ".f.", "f..", "fff"],
    "-": ["...", "...", "fff", "...", "..."],
    ".": ["...", "...", "...", "...", ".f."],
    "!": [".f.", ".f.", ".f.", "...", ".f."],
    "'": [".f.", ".f.", "...", "...", "..."],
    "/": ["..f", "..f", ".f.", "f..", "f.."],
  }).map(([ch, rows]) => [ch, decodeSprite(rows)]),
);

// Green check for completed level slots (8×8).
export const CHECK = decodeSprite([
  "........",
  ".......a",
  "......aa",
  "a....aa.",
  "aa..aa..",
  ".aaaa...",
  "..aa....",
  "........",
]);

// Poppy's rocket, reassembled (16×32) — wheelbarrow chic. All four parts
// visible: Big Red Button nose, Fizz Tank band, Left (and right) Fins,
// Sputter Coil at the engine. Flame is drawn dynamically by the cutscene.
export const ROCKET = decodeSprite([
  "......44........",
  ".....4444.......",
  "....777777......",
  "...77777777.....",
  "...77777777.....",
  "...77bbbb77.....",
  "...77b11b77.....",
  "...77b11b77.....",
  "...77bbbb77.....",
  "...77777777.....",
  "...77777777.....",
  "...73333337.....",
  "...73333337.....",
  "...77777777.....",
  "...77777777.....",
  "..c77777777c....",
  ".cc77777777cc...",
  "ccc77777777ccc..",
  "ccc77777777ccc..",
  "ccc77777777ccc..",
  "...66666666.....",
  "...6e6e6e6e.....",
  "...66666666.....",
  "....888888......",
  "....8....8......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
]);

// Mini Poppy head for the lives readout (8×8).
export const MINI_POPPY = decodeSprite([
  ".eeeee..",
  "eeeeeee.",
  "ef0ff0e.",
  "efffffe.",
  ".fffff..",
  ".99999..",
  "9999999.",
  ".9...9..",
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
