// src/render.ts — browser-side rendering. Touches Canvas; NEVER mutates sim
// state (divergence rule 2: rendering reads, it never writes).
import { PALETTE } from "./lib/palette.ts";
import { TILE, TILE_SIZE, type LevelData, type TileId } from "./lib/level.ts";
import {
  BUBBLE,
  GLOBBIN,
  GLOBBIN_SQUISHED,
  JANITOR_BOT,
  JANITOR_BOT_SQUISHED,
  PRICKLE_PIG,
  PRICKLE_PIG_WALK2,
  POPPY_BOING,
  POPPY_IDLE,
  POPPY_JUMP,
  POPPY_RUN1,
  POPPY_RUN2,
  TILE_DOOR,
  TILE_EXIT,
  TILE_PLATFORM,
  TILE_SOLID,
  TILE_SPIKE,
  DIGITS,
  KEYCARD,
  MINI_POPPY,
  PART_BIG_RED_BUTTON,
  PART_FIZZ_TANK,
  PART_LEFT_FIN,
  PART_SPUTTER_COIL,
  SODA_CAP,
  SPARKLE_A,
  SPARKLE_B,
  type SpriteGrid,
} from "./lib/art.ts";
import type { Player } from "./lib/player.ts";
import type { Bubble, Enemy } from "./lib/enemies.ts";
import type { Item, PartId } from "./lib/items.ts";
import type { Game } from "./lib/game.ts";

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
  [TILE.door, bakeSprite(TILE_DOOR)],
]);

export const exitSprite = bakeSprite(TILE_EXIT);

const poppyFrames = {
  idle: bakeFacing(POPPY_IDLE),
  run1: bakeFacing(POPPY_RUN1),
  run2: bakeFacing(POPPY_RUN2),
  jump: bakeFacing(POPPY_JUMP),
  boing: bakeFacing(POPPY_BOING),
};

const enemySprites = {
  globbin: { alive: bakeFacing(GLOBBIN), squished: bakeSprite(GLOBBIN_SQUISHED) },
  pricklePig: {
    walk1: bakeFacing(PRICKLE_PIG),
    walk2: bakeFacing(PRICKLE_PIG_WALK2),
  },
  janitorBot: { alive: bakeFacing(JANITOR_BOT), squished: bakeSprite(JANITOR_BOT_SQUISHED) },
};
const bubbleSprite = bakeSprite(BUBBLE);

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: readonly Enemy[],
  camX: number,
  camY: number,
): void {
  for (const e of enemies) {
    // Sprites are 16×16 with feet on the bottom row; bodies are smaller.
    const dx = Math.round(e.x - camX) - Math.floor((16 - e.w) / 2);
    const dy = Math.round(e.y - camY) + e.h - 16;
    let sprite: HTMLCanvasElement;
    if (e.kind === "pricklePig") {
      const frame =
        Math.floor(e.animTime / 0.18) % 2 === 0
          ? enemySprites.pricklePig.walk1
          : enemySprites.pricklePig.walk2;
      sprite = e.facing === 1 ? frame.right : frame.left;
    } else {
      const set = enemySprites[e.kind];
      sprite = e.alive
        ? e.facing === 1
          ? set.alive.right
          : set.alive.left
        : set.squished;
    }
    ctx.drawImage(sprite, dx, dy);
  }
}

export function drawBubbles(
  ctx: CanvasRenderingContext2D,
  bubbles: readonly Bubble[],
  camX: number,
  camY: number,
): void {
  for (const b of bubbles) {
    ctx.drawImage(bubbleSprite, Math.round(b.x - camX), Math.round(b.y - camY));
  }
}

const itemSprites = {
  sodaCap: bakeSprite(SODA_CAP),
  keycard: bakeSprite(KEYCARD),
  parts: {
    1: bakeSprite(PART_SPUTTER_COIL),
    2: bakeSprite(PART_FIZZ_TANK),
    3: bakeSprite(PART_LEFT_FIN),
    4: bakeSprite(PART_BIG_RED_BUTTON),
  } as Record<PartId, HTMLCanvasElement>,
  sparkleA: bakeSprite(SPARKLE_A),
  sparkleB: bakeSprite(SPARKLE_B),
};
const digitSprites = DIGITS.map((d) => bakeSprite(d));
const miniPoppy = bakeSprite(MINI_POPPY);

/** HUD chip colors per ship part. */
const PART_COLORS: Record<PartId, number> = { 1: 6, 2: 3, 3: 4, 4: 12 };

export function drawItems(
  ctx: CanvasRenderingContext2D,
  items: readonly Item[],
  camX: number,
  camY: number,
  /** Any monotonically increasing sim clock (drives the sparkle). */
  t: number,
): void {
  for (const it of items) {
    if (it.taken) continue;
    const dx = Math.round(it.x - camX);
    const dy = Math.round(it.y - camY);
    if (it.kind === "sodaCap") {
      ctx.drawImage(itemSprites.sodaCap, dx, dy);
    } else if (it.kind === "keycard") {
      ctx.drawImage(itemSprites.keycard, dx, dy);
    } else if (it.kind === "shipPart" && it.part) {
      // 16×16 sprite centered on the 14×14 body.
      ctx.drawImage(itemSprites.parts[it.part], dx - 1, dy - 1);
      const sparkle = Math.floor(t / 0.25) % 2 === 0 ? itemSprites.sparkleA : itemSprites.sparkleB;
      ctx.drawImage(sparkle, dx - 1, dy - 1);
    }
  }
}

/** Draw an unsigned integer with the 3×5 pixel digits. Returns end x. */
export function drawNumber(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  minDigits = 1,
): number {
  const text = Math.max(0, Math.floor(value)).toString().padStart(minDigits, "0");
  let cx = x;
  for (const ch of text) {
    ctx.drawImage(digitSprites[Number(ch)], cx, y);
    cx += 4;
  }
  return cx;
}

/** The bottom-16px HUD strip: score, lives, keycard, four part slots. */
export function drawHud(ctx: CanvasRenderingContext2D, game: Game, viewW: number, viewH: number): void {
  const top = viewH - 16;
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, top, viewW, 16);
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(0, top, viewW, 1);

  // Score: soda-cap icon + 6 digits.
  ctx.drawImage(itemSprites.sodaCap, 4, top + 4);
  drawNumber(ctx, game.run.score, 16, top + 5, 6);

  // Lives: mini Poppy + count.
  ctx.drawImage(miniPoppy, 52, top + 4);
  drawNumber(ctx, game.run.lives, 63, top + 5);

  // Keycard indicator.
  if (game.hasKeycard) ctx.drawImage(itemSprites.keycard, 76, top + 4);

  // Four ship-part slots, right-aligned: dark outline, colored chip when found.
  for (let i = 0; i < 4; i++) {
    const x = viewW - 4 - (4 - i) * 16;
    ctx.strokeStyle = PALETTE[8];
    ctx.strokeRect(x + 0.5, top + 2.5, 11, 11);
    if (game.run.parts[i]) {
      ctx.fillStyle = PALETTE[PART_COLORS[(i + 1) as PartId]];
      ctx.fillRect(x + 2, top + 4, 8, 8);
      ctx.fillStyle = PALETTE[15];
      ctx.drawImage(digitSprites[i + 1], x + 4, top + 6);
    }
  }
}

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
