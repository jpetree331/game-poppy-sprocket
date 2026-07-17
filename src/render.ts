// src/render.ts — browser-side rendering. Touches Canvas; NEVER mutates sim
// state (divergence rule 2: rendering reads, it never writes).
import { PALETTE } from "./lib/palette.ts";
import { TILE, TILE_SIZE, type LevelData, type TileId } from "./lib/level.ts";
import {
  TILE_EXIT,
  TILE_PLATFORM,
  TILE_SOLID,
  TILE_SPIKE,
  type SpriteGrid,
} from "./lib/art.ts";

/** Bake a palette-index grid into an offscreen canvas, once, at boot. */
export function bakeSprite(grid: SpriteGrid): HTMLCanvasElement {
  const h = grid.length;
  const w = grid[0].length;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = grid[y][x];
      if (p === -1) continue;
      ctx.fillStyle = PALETTE[p];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

const tileSprites = new Map<TileId, HTMLCanvasElement>([
  [TILE.solid, bakeSprite(TILE_SOLID)],
  [TILE.platform, bakeSprite(TILE_PLATFORM)],
  [TILE.spike, bakeSprite(TILE_SPIKE)],
]);

export const exitSprite = bakeSprite(TILE_EXIT);

/**
 * Draw the visible slice of the tile grid. camX/camY are the camera's
 * top-left in world pixels; tiles snap to whole pixels for the EGA look.
 */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  const c0 = Math.max(0, Math.floor(camX / TILE_SIZE));
  const c1 = Math.min(level.width - 1, Math.floor((camX + viewW) / TILE_SIZE));
  const r0 = Math.max(0, Math.floor(camY / TILE_SIZE));
  const r1 = Math.min(level.height - 1, Math.floor((camY + viewH) / TILE_SIZE));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = level.tiles[r * level.width + c];
      if (t === TILE.empty) continue;
      const sprite = tileSprites.get(t);
      if (sprite) {
        ctx.drawImage(sprite, c * TILE_SIZE - Math.round(camX), r * TILE_SIZE - Math.round(camY));
      }
    }
  }
}
