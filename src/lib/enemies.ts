// src/lib/enemies.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// The critters of Murkk-7:
//   Globbin      — hops toward Poppy; harmless to touch from above (squish).
//   Prickle-Pig  — ledge-aware patroller; lethal on contact, even from above.
//   Janitor-Bot  — stationary; lobs slow soap bubbles that pop on tiles.
//                  Squishable from above (it's a robot — a stomp disables it).

import { applyGravity, moveBody, aabbOverlap, type Body } from "./physics.ts";
import { TILE, TILE_SIZE, tileAt, type LevelData, type Spawn } from "./level.ts";
import type { Player } from "./player.ts";

export type EnemyKind = "globbin" | "pricklePig" | "janitorBot";

export interface Enemy extends Body {
  kind: EnemyKind;
  alive: boolean;
  /** Seconds since squished; squished corpses linger briefly for the flatten frame. */
  squishTime: number;
  facing: 1 | -1;
  /** Per-kind behavior timer (hop pause, lob cooldown). */
  timer: number;
  animTime: number;
}

export interface Bubble extends Body {
  alive: boolean;
  age: number;
}

const SIZES: Record<EnemyKind, { w: number; h: number }> = {
  globbin: { w: 14, h: 12 },
  pricklePig: { w: 14, h: 10 },
  janitorBot: { w: 14, h: 14 },
};

export const GLOBBIN_HOP_PAUSE = 0.8;
export const GLOBBIN_HOP_VY = -180;
export const GLOBBIN_HOP_VX = 60;
export const PRICKLE_SPEED = 40;
export const BOT_LOB_COOLDOWN = 2.5;
export const BUBBLE_GRAVITY = 150;
export const BUBBLE_VX = 50;
export const BUBBLE_VY = -110;
export const BUBBLE_MAX_AGE = 6;
export const SQUISH_LINGER = 0.4;
/** Squishable kinds award this many points. */
export const SQUISH_SCORE = 200;

export function spawnEnemies(level: LevelData): Enemy[] {
  const enemies: Enemy[] = [];
  for (const s of level.spawns) {
    if (s.kind === "globbin" || s.kind === "pricklePig" || s.kind === "janitorBot") {
      enemies.push(makeEnemy(s));
    }
  }
  return enemies;
}

function makeEnemy(s: Spawn): Enemy {
  const kind = s.kind as EnemyKind;
  const { w, h } = SIZES[kind];
  return {
    kind,
    x: s.col * TILE_SIZE + (TILE_SIZE - w) / 2,
    y: s.row * TILE_SIZE + (TILE_SIZE - h),
    w,
    h,
    vx: 0,
    vy: 0,
    onGround: false,
    alive: true,
    squishTime: 0,
    facing: 1,
    timer: kind === "janitorBot" ? BOT_LOB_COOLDOWN : GLOBBIN_HOP_PAUSE,
    animTime: 0,
  };
}

/** True if walking one more step in `dir` would leave the current ledge. */
function ledgeAhead(e: Enemy, level: LevelData, dir: 1 | -1): boolean {
  const aheadX = dir === 1 ? e.x + e.w + 1 : e.x - 1;
  const col = Math.floor(aheadX / TILE_SIZE);
  const rowBelow = Math.floor((e.y + e.h + 1) / TILE_SIZE);
  const t = tileAt(level, col, rowBelow);
  return t !== TILE.solid && t !== TILE.platform;
}

export interface EnemyTickResult {
  /** Bubbles newly lobbed this tick. */
  lobbed: Bubble[];
}

export function updateEnemies(
  enemies: Enemy[],
  level: LevelData,
  player: Player,
  dt: number,
): EnemyTickResult {
  const lobbed: Bubble[] = [];
  for (const e of enemies) {
    e.animTime += dt;
    if (!e.alive) {
      e.squishTime += dt;
      continue;
    }
    switch (e.kind) {
      case "globbin": {
        if (e.onGround) {
          e.vx = 0;
          e.timer -= dt;
          if (e.timer <= 0) {
            const dir: 1 | -1 = player.x >= e.x ? 1 : -1;
            e.facing = dir;
            e.vx = dir * GLOBBIN_HOP_VX;
            e.vy = GLOBBIN_HOP_VY;
            e.onGround = false;
            e.timer = GLOBBIN_HOP_PAUSE;
          }
        }
        applyGravity(e, dt);
        moveBody(e, level, dt);
        break;
      }
      case "pricklePig": {
        if (e.vx === 0) e.vx = PRICKLE_SPEED * e.facing;
        if (e.onGround && ledgeAhead(e, level, e.facing)) {
          e.facing = -e.facing as 1 | -1;
          e.vx = PRICKLE_SPEED * e.facing;
        }
        applyGravity(e, dt);
        const r = moveBody(e, level, dt);
        if (r.hitWall) {
          e.facing = -e.facing as 1 | -1;
          e.vx = PRICKLE_SPEED * e.facing;
        }
        break;
      }
      case "janitorBot": {
        e.facing = player.x >= e.x ? 1 : -1;
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = BOT_LOB_COOLDOWN;
          lobbed.push({
            x: e.x + e.w / 2 - 4,
            y: e.y - 6,
            w: 8,
            h: 8,
            vx: BUBBLE_VX * e.facing,
            vy: BUBBLE_VY,
            onGround: false,
            alive: true,
            age: 0,
          });
        }
        // Stationary: still needs gravity so it sits on its perch.
        applyGravity(e, dt);
        moveBody(e, level, dt);
        break;
      }
    }
  }
  // Drop long-squished corpses.
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive && enemies[i].squishTime > SQUISH_LINGER) {
      enemies.splice(i, 1);
    }
  }
  return { lobbed };
}

export function updateBubbles(bubbles: Bubble[], level: LevelData, dt: number): void {
  for (const b of bubbles) {
    b.age += dt;
    b.vy += BUBBLE_GRAVITY * dt;
    const r = moveBody(b, level, dt);
    if (r.hitWall || r.hitCeiling || r.landed || b.age > BUBBLE_MAX_AGE) {
      b.alive = false; // pops on tiles (or just gets tired)
    }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    if (!bubbles[i].alive) bubbles.splice(i, 1);
  }
}

/** Can this enemy be squished by a stomp from above? */
export function isSquishable(kind: EnemyKind): boolean {
  return kind === "globbin" || kind === "janitorBot";
}

/**
 * Player-vs-enemy contact rule. "squish" when the player is falling and was
 * mostly above the enemy; "hurt" otherwise (or always, for a Prickle-Pig).
 */
export function contactOutcome(player: Player, e: Enemy): "squish" | "hurt" | null {
  if (!e.alive || player.dead) return null;
  if (!aabbOverlap(player, e)) return null;
  if (
    isSquishable(e.kind) &&
    player.vy > 0 &&
    player.y + player.h - e.y < e.h * 0.6
  ) {
    return "squish";
  }
  return "hurt";
}

export function squish(e: Enemy): void {
  e.alive = false;
  e.squishTime = 0;
  e.vx = 0;
  e.vy = 0;
}
