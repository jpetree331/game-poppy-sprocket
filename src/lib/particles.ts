// src/lib/particles.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// The juice: landing dust puffs, squish stars, part-collect sparkle bursts.
// Every particle is a palette-indexed square updated on the fixed timestep;
// render just draws rects. Pure presentation — nothing reads these back.

import type { PaletteIndex } from "./palette.ts";
import { EGA } from "./palette.ts";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds remaining. */
  life: number;
  maxLife: number;
  color: PaletteIndex;
  size: number;
  gravity: number;
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function push(
  ps: Particle[],
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: PaletteIndex,
  size: number,
  gravity: number,
): void {
  ps.push({ x, y, vx, vy, life, maxLife: life, color, size, gravity });
}

/** Landing dust: a few gray puffs kicked out sideways at the feet. */
export function spawnDust(ps: Particle[], x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    push(
      ps,
      x + rnd(-4, 4),
      y + rnd(-2, 0),
      dir * rnd(15, 45),
      rnd(-25, -5),
      rnd(0.2, 0.35),
      i % 3 === 0 ? EGA.darkGray : EGA.lightGray,
      i % 2 === 0 ? 2 : 1,
      60,
    );
  }
}

/** Squish stars: a happy little burst where a critter used to be. */
export function spawnStars(ps: Particle[], x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    push(
      ps,
      x,
      y,
      Math.cos(angle) * rnd(40, 70),
      Math.sin(angle) * rnd(40, 70) - 30,
      rnd(0.3, 0.5),
      i % 2 === 0 ? EGA.white : EGA.lightGreen,
      i % 2 === 0 ? 2 : 1,
      160,
    );
  }
}

/** Part-collect burst: a shower in the part's color plus white glints. */
export function spawnSparkleBurst(ps: Particle[], x: number, y: number, color: PaletteIndex): void {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    push(
      ps,
      x,
      y,
      Math.cos(angle) * rnd(30, 90),
      Math.sin(angle) * rnd(30, 90),
      rnd(0.4, 0.7),
      i % 3 === 0 ? EGA.white : i % 3 === 1 ? color : EGA.yellow,
      i % 4 === 0 ? 2 : 1,
      40,
    );
  }
}

/** Death poof: red-and-gray, drifting up — gentle, this is a kid's game. */
export function spawnDeathPoof(ps: Particle[], x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    push(
      ps,
      x + rnd(-5, 5),
      y + rnd(-6, 2),
      rnd(-30, 30),
      rnd(-60, -20),
      rnd(0.4, 0.6),
      i % 2 === 0 ? EGA.lightRed : EGA.lightGray,
      2,
      -20, // floats up
    );
  }
}

export function updateParticles(ps: Particle[], dt: number): void {
  for (const p of ps) {
    p.life -= dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = ps.length - 1; i >= 0; i--) {
    if (ps[i].life <= 0) ps.splice(i, 1);
  }
}
