// src/render.ts — browser-side rendering. Touches Canvas; NEVER mutates sim
// state (divergence rule 2: rendering reads, it never writes).
import { PALETTE } from "./lib/palette.ts";
import { TILE, TILE_SIZE, type LevelData, type TileId } from "./lib/level.ts";
import {
  POPPY_BOING,
  POPPY_IDLE,
  POPPY_JUMP,
  POPPY_RUN1,
  POPPY_RUN2,
  TILE_EXIT,
  TILE_PLATFORM,
  TILE_SOLID,
  TILE_SPIKE,
  type SpriteGrid,
} from "./lib/art.ts";
import type { Player } from "./lib/player.ts";

/** Bake a palette-index grid into an offscreen canvas, once, at boot. */
export function bakeSprite(grid: SpriteGrid, flip = false): HTMLCanvasElement {
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
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return canvas;
}

/** A right-facing sprite plus its mirror, baked once. */
export function bakeFacing(grid: SpriteGrid): { right: HTMLCanvasElement; left: HTMLCanvasElement } {
  return { right: bakeSprite(grid), left: bakeSprite(grid, true) };
}

const tileSprites = new Map<TileId, HTMLCanvasElement>([
  [TILE.solid, bakeSprite(TILE_SOLID)],
  [TILE.platform, bakeSprite(TILE_PLATFORM)],
  [TILE.spike, bakeSprite(TILE_SPIKE)],
]);

export const exitSprite = bakeSprite(TILE_EXIT);

const poppyFrames = {
  idle: bakeFacing(POPPY_IDLE),
  run1: bakeFacing(POPPY_RUN1),
  run2: bakeFacing(POPPY_RUN2),
  jump: bakeFacing(POPPY_JUMP),
  boing: bakeFacing(POPPY_BOING),
};

/** Pick and draw Poppy's frame from sim state. Reads only, never mutates. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  camX: number,
  camY: number,
): void {
  if (p.dead && Math.floor(p.deadTime * 10) % 2 === 1) return; // death blink

  let frame: { right: HTMLCanvasElement; left: HTMLCanvasElement };
  if (!p.onGround) {
    frame = p.mode === "boing" ? poppyFrames.boing : poppyFrames.jump;
  } else if (p.mode === "boing") {
    frame = poppyFrames.boing;
  } else if (Math.abs(p.vx) > 5) {
    frame = Math.floor(p.animTime / 0.12) % 2 === 0 ? poppyFrames.run1 : poppyFrames.run2;
  } else {
    frame = poppyFrames.idle;
  }

  const sprite = p.facing === 1 ? frame.right : frame.left;
  // Sprite is 16×16 with feet on the bottom row; body is 12×14. Center
  // horizontally, align feet.
  const dx = Math.round(p.x - camX) - (16 - p.w) / 2;
  const dy = Math.round(p.y - camY) + p.h - 16;
  ctx.drawImage(sprite, dx, dy);
}

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
