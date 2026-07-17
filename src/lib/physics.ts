// src/lib/physics.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Swept, axis-separated AABB vs. tile-grid collision. Movement is sub-stepped
// so no single axis ever advances more than half a tile at once — fast bodies
// cannot tunnel, even if some future feature cranks velocities.
// Only update() code calls this; nothing here may run in a render callback.

import { TILE, TILE_SIZE, tileAt, type LevelData, type TileId } from "./level.ts";

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface MoveResult {
  hitWall: boolean;
  hitCeiling: boolean;
  landed: boolean;
  onSpike: boolean;
}

export const GRAVITY = 800; // px/s²
export const MAX_FALL = 300; // px/s terminal velocity

const MAX_SUBSTEP = TILE_SIZE / 2;

export function applyGravity(body: Body, dt: number): void {
  body.vy = Math.min(body.vy + GRAVITY * dt, MAX_FALL);
}

function isBlockingHorizontal(t: TileId): boolean {
  return t === TILE.solid;
}

function colSpan(body: Body): [number, number] {
  return [Math.floor(body.x / TILE_SIZE), Math.floor((body.x + body.w - 1e-6) / TILE_SIZE)];
}
function rowSpan(body: Body): [number, number] {
  return [Math.floor(body.y / TILE_SIZE), Math.floor((body.y + body.h - 1e-6) / TILE_SIZE)];
}

/**
 * Move a body by its velocity over dt, resolving against the tile grid.
 * X and Y are resolved separately per sub-step. Platforms (`=`) block only
 * downward motion, and only when the body's bottom started at or above the
 * platform's top — so you can jump up through them and land on them.
 */
export function moveBody(body: Body, level: LevelData, dt: number): MoveResult {
  const result: MoveResult = {
    hitWall: false,
    hitCeiling: false,
    landed: false,
    onSpike: false,
  };

  const totalDx = body.vx * dt;
  const totalDy = body.vy * dt;
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(totalDx), Math.abs(totalDy)) / MAX_SUBSTEP),
  );
  const wasOnGround = body.onGround;
  body.onGround = false;

  for (let s = 0; s < steps; s++) {
    // --- X axis ---
    const dx = totalDx / steps;
    if (dx !== 0) {
      body.x += dx;
      const [r0, r1] = rowSpan(body);
      if (dx > 0) {
        const col = Math.floor((body.x + body.w - 1e-6) / TILE_SIZE);
        for (let r = r0; r <= r1; r++) {
          if (isBlockingHorizontal(tileAt(level, col, r))) {
            body.x = col * TILE_SIZE - body.w;
            body.vx = 0;
            result.hitWall = true;
            break;
          }
        }
      } else {
        const col = Math.floor(body.x / TILE_SIZE);
        for (let r = r0; r <= r1; r++) {
          if (isBlockingHorizontal(tileAt(level, col, r))) {
            body.x = (col + 1) * TILE_SIZE;
            body.vx = 0;
            result.hitWall = true;
            break;
          }
        }
      }
    }

    // --- Y axis ---
    const dy = totalDy / steps;
    if (dy !== 0) {
      const prevBottom = body.y + body.h;
      body.y += dy;
      const [c0, c1] = colSpan(body);
      if (dy > 0) {
        const row = Math.floor((body.y + body.h - 1e-6) / TILE_SIZE);
        const rowTop = row * TILE_SIZE;
        for (let c = c0; c <= c1; c++) {
          const t = tileAt(level, c, row);
          const blocks =
            t === TILE.solid ||
            (t === TILE.platform && prevBottom <= rowTop + 1e-6);
          if (blocks) {
            body.y = rowTop - body.h;
            body.vy = 0;
            body.onGround = true;
            if (!wasOnGround) result.landed = true;
            break;
          }
        }
      } else {
        const row = Math.floor(body.y / TILE_SIZE);
        for (let c = c0; c <= c1; c++) {
          if (tileAt(level, c, row) === TILE.solid) {
            body.y = (row + 1) * TILE_SIZE;
            body.vy = 0;
            result.hitCeiling = true;
            break;
          }
        }
      }
    }
  }

  // Standing check: still grounded if velocity is non-negative and there is
  // solid-or-platform support within a hair below our feet.
  if (!body.onGround && body.vy >= 0) {
    const probeRow = Math.floor((body.y + body.h + 0.5) / TILE_SIZE);
    const feetOnRowBoundary =
      Math.abs(body.y + body.h - probeRow * TILE_SIZE) < 0.51;
    if (feetOnRowBoundary) {
      const [c0, c1] = colSpan(body);
      for (let c = c0; c <= c1; c++) {
        const t = tileAt(level, c, probeRow);
        if (t === TILE.solid || t === TILE.platform) {
          body.onGround = true;
          break;
        }
      }
    }
  }

  result.onSpike = overlapsSpike(body, level);
  return result;
}

export function overlapsSpike(body: Body, level: LevelData): boolean {
  const [c0, c1] = colSpan(body);
  const [r0, r1] = rowSpan(body);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (tileAt(level, c, r) === TILE.spike) return true;
    }
  }
  return false;
}

export function aabbOverlap(a: Body | { x: number; y: number; w: number; h: number },
                            b: Body | { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
