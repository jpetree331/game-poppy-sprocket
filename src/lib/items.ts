// src/lib/items.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Collectibles: soda caps (100 pts), the keycard (opens locked doors), and
// the four ship parts. Items are static AABBs; collection is overlap.

import { TILE_SIZE, type LevelData } from "./level.ts";
import { aabbOverlap } from "./physics.ts";
import type { Player } from "./player.ts";

export type ItemKind = "sodaCap" | "keycard" | "shipPart";
export type PartId = 1 | 2 | 3 | 4;

export const PART_NAMES: Record<PartId, string> = {
  1: "Sputter Coil",
  2: "Fizz Tank",
  3: "Left Fin",
  4: "Big Red Button",
};

export const CAP_SCORE = 100;
export const PART_SCORE = 1000;

export interface Item {
  kind: ItemKind;
  part?: PartId;
  x: number;
  y: number;
  w: number;
  h: number;
  taken: boolean;
}

const ITEM_SIZES: Record<ItemKind, { w: number; h: number }> = {
  sodaCap: { w: 8, h: 8 },
  keycard: { w: 10, h: 8 },
  shipPart: { w: 14, h: 14 },
};

export function spawnItems(level: LevelData): Item[] {
  const items: Item[] = [];
  for (const s of level.spawns) {
    if (s.kind !== "sodaCap" && s.kind !== "keycard" && s.kind !== "shipPart") continue;
    const { w, h } = ITEM_SIZES[s.kind];
    items.push({
      kind: s.kind,
      part: s.part,
      x: s.col * TILE_SIZE + (TILE_SIZE - w) / 2,
      y: s.row * TILE_SIZE + (TILE_SIZE - h) / 2,
      w,
      h,
      taken: false,
    });
  }
  return items;
}

export interface Collected {
  caps: number;
  keycard: boolean;
  parts: PartId[];
}

export function collectItems(player: Player, items: Item[]): Collected {
  const got: Collected = { caps: 0, keycard: false, parts: [] };
  if (player.dead) return got;
  for (const it of items) {
    if (it.taken || !aabbOverlap(player, it)) continue;
    it.taken = true;
    if (it.kind === "sodaCap") got.caps++;
    else if (it.kind === "keycard") got.keycard = true;
    else if (it.kind === "shipPart" && it.part) got.parts.push(it.part);
  }
  return got;
}
