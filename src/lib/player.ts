// src/lib/player.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Poppy's kinematics: run accel/decel with a slight skid, coyote time,
// jump buffering, variable jump height (release = cut), and the Boing Boot —
// a continuous-bounce mode where holding jump at contact springs ~2× normal
// jump height and momentum carries in the air.

import type { InputSnapshot } from "./input.ts";
import { applyGravity, moveBody, type Body } from "./physics.ts";
import { TILE_SIZE, type LevelData } from "./level.ts";

export const PLAYER_W = 12;
export const PLAYER_H = 14;

// Movement tuning (px, seconds). Jump apex ≈ v²/2g: normal ~39 px (2.4
// tiles), big boing ~79 px (4.9 tiles), small boing ~25 px.
export const RUN_MAX = 110;
export const RUN_ACCEL = 700;
export const SKID_DECEL = 900; // reversing on the ground — the skid feel
export const GROUND_FRICTION = 700;
export const AIR_ACCEL = 350;
export const AIR_DRAG = 60; // walk mode only; boing mode keeps momentum
export const JUMP_VEL = 250;
export const JUMP_CUT = 0.4; // multiply vy on early release
export const BOING_SMALL = 200;
export const BOING_BIG = 355;
// ~80 ms per the brief; 0.09 because the timer decrements before the jump
// check each tick, so the effective window is one tick shorter than the raw
// value (0.09 s ⇒ jumps fire up to ~83 ms after leaving a ledge).
export const COYOTE_TIME = 0.09;
export const JUMP_BUFFER = 0.1;
export const DEATH_PAUSE = 0.6; // seconds before the game respawns us

export type PlayerMode = "walk" | "boing";

export interface Player extends Body {
  facing: 1 | -1;
  mode: PlayerMode;
  coyote: number;
  jumpBuffer: number;
  /** True from a walk-mode jump until landing; enables the release cut. */
  jumping: boolean;
  dead: boolean;
  deadTime: number;
  /** Accumulated sim time for animation frame selection (render reads it). */
  animTime: number;
}

export interface PlayerEvents {
  jumped: boolean;
  /** "small" auto-bounce, "big" jump-held bounce, or null. */
  boinged: "small" | "big" | null;
  landed: boolean;
  died: boolean;
}

export function createPlayer(spawn: { col: number; row: number }): Player {
  return {
    x: spawn.col * TILE_SIZE + (TILE_SIZE - PLAYER_W) / 2,
    y: spawn.row * TILE_SIZE + (TILE_SIZE - PLAYER_H),
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    mode: "walk",
    coyote: 0,
    jumpBuffer: 0,
    jumping: false,
    dead: false,
    deadTime: 0,
    animTime: 0,
  };
}

export function respawnPlayer(p: Player, spawn: { col: number; row: number }): void {
  p.x = spawn.col * TILE_SIZE + (TILE_SIZE - PLAYER_W) / 2;
  p.y = spawn.row * TILE_SIZE + (TILE_SIZE - PLAYER_H);
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.mode = "walk";
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.jumping = false;
  p.dead = false;
  p.deadTime = 0;
}

export function updatePlayer(
  p: Player,
  level: LevelData,
  input: InputSnapshot,
  dt: number,
): PlayerEvents {
  const events: PlayerEvents = { jumped: false, boinged: null, landed: false, died: false };
  p.animTime += dt;

  if (p.dead) {
    p.deadTime += dt;
    return events;
  }

  // --- horizontal ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    p.facing = dir as 1 | -1;
    const reversing = Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== dir;
    const accel = p.onGround ? (reversing ? SKID_DECEL : RUN_ACCEL) : AIR_ACCEL;
    p.vx += dir * accel * dt;
    p.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, p.vx));
  } else {
    const drag = p.onGround
      ? GROUND_FRICTION
      : p.mode === "boing"
        ? 0 // the boot keeps its momentum
        : AIR_DRAG;
    const dv = drag * dt;
    if (Math.abs(p.vx) <= dv) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * dv;
  }

  // --- timers ---
  p.coyote = p.onGround ? COYOTE_TIME : Math.max(0, p.coyote - dt);
  p.jumpBuffer = input.jumpPressed ? JUMP_BUFFER : Math.max(0, p.jumpBuffer - dt);

  // --- boot toggle ---
  if (input.boingPressed) {
    p.mode = p.mode === "walk" ? "boing" : "walk";
    if (p.mode === "boing" && p.onGround) {
      // Self-start the spring so toggling on the ground feels alive.
      p.vy = -BOING_SMALL;
      p.onGround = false;
      p.coyote = 0;
      events.boinged = "small";
    }
    if (p.mode === "walk") p.jumping = false;
  }

  // --- walk-mode jump (coyote + buffer) ---
  if (p.mode === "walk" && p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = -JUMP_VEL;
    p.jumping = true;
    p.onGround = false;
    p.jumpBuffer = 0;
    p.coyote = 0;
    events.jumped = true;
  }
  // Variable height: releasing while rising cuts the jump (never cuts a boing).
  if (p.jumping && input.jumpReleased && p.vy < 0) {
    p.vy *= JUMP_CUT;
    p.jumping = false;
  }

  // --- integrate ---
  applyGravity(p, dt);
  const result = moveBody(p, level, dt);

  if (result.landed) {
    events.landed = true;
    p.jumping = false;
    if (p.mode === "boing") {
      // Continuous bounce: holding jump (or a buffered press) at contact
      // springs big; otherwise a small keep-alive bounce.
      const big = input.jump || p.jumpBuffer > 0;
      p.vy = big ? -BOING_BIG : -BOING_SMALL;
      p.onGround = false;
      p.jumpBuffer = 0;
      p.coyote = 0;
      events.boinged = big ? "big" : "small";
      events.landed = false; // we never really settled
    }
  }

  if (result.onSpike) {
    p.dead = true;
    p.deadTime = 0;
    p.vx = 0;
    p.vy = 0;
    events.died = true;
  }

  return events;
}
