// src/lib/game.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Owns one level's worth of sim (map, Poppy, critters, items) plus the
// RunState that outlives any single level: score, lives, and which ship
// parts have been recovered. Sprint 5 threads the same RunState through the
// level chain; here it already persists across createGame calls.

import type { InputSnapshot } from "./input.ts";
import { parseLevel, unlockDoorAt, TILE, TILE_SIZE, type LevelData } from "./level.ts";
import {
  contactOutcome,
  spawnEnemies,
  squish,
  updateBubbles,
  updateEnemies,
  SQUISH_SCORE,
  type Bubble,
  type Enemy,
} from "./enemies.ts";
import {
  collectItems,
  spawnItems,
  CAP_SCORE,
  PART_SCORE,
  type Item,
  type PartId,
} from "./items.ts";
import { aabbOverlap } from "./physics.ts";
import {
  createPlayer,
  respawnPlayer,
  updatePlayer,
  DEATH_PAUSE,
  type Player,
  type PlayerEvents,
} from "./player.ts";

export const STARTING_LIVES = 3;

/** Progress that survives level loads (and gets reset by a fresh run). */
export interface RunState {
  score: number;
  lives: number;
  parts: [boolean, boolean, boolean, boolean];
}

export function newRun(): RunState {
  return { score: 0, lives: STARTING_LIVES, parts: [false, false, false, false] };
}

export type GamePhase = "playing" | "gameover";

export interface Game {
  levelText: string;
  level: LevelData;
  player: Player;
  enemies: Enemy[];
  bubbles: Bubble[];
  items: Item[];
  /** Exit-door rects (from `E` spawns). */
  exits: Array<{ x: number; y: number; w: number; h: number }>;
  hasKeycard: boolean;
  run: RunState;
  phase: GamePhase;
}

export interface GameEvents extends PlayerEvents {
  respawned: boolean;
  squished: boolean;
  gameOver: boolean;
  restarted: boolean;
  capsCollected: number;
  gotKeycard: boolean;
  partsCollected: PartId[];
  doorOpened: boolean;
  /** Poppy walked into an exit door this tick. */
  exitReached: boolean;
}

const NO_EVENTS: Omit<GameEvents, keyof PlayerEvents> = {
  respawned: false,
  squished: false,
  gameOver: false,
  restarted: false,
  capsCollected: 0,
  gotKeycard: false,
  partsCollected: [],
  doorOpened: false,
  exitReached: false,
};

export function createGame(levelText: string, run: RunState = newRun()): Game {
  const level = parseLevel(levelText);
  return {
    levelText,
    level,
    player: createPlayer(level.playerSpawn),
    enemies: spawnEnemies(level),
    bubbles: [],
    items: spawnItems(level),
    exits: level.spawns
      .filter((s) => s.kind === "exit")
      .map((s) => ({ x: s.col * TILE_SIZE + 2, y: s.row * TILE_SIZE, w: TILE_SIZE - 4, h: TILE_SIZE })),
    hasKeycard: false,
    run,
    phase: "playing",
  };
}

/** Respawn after death: critters reset, collected items STAY collected. */
function resetLevelEntities(game: Game): void {
  game.enemies = spawnEnemies(game.level);
  game.bubbles = [];
  respawnPlayer(game.player, game.level.playerSpawn);
}

/** Full fresh run from game over: re-parse so opened doors re-lock. */
function restartRun(game: Game): void {
  game.level = parseLevel(game.levelText);
  game.run = newRun();
  game.items = spawnItems(game.level);
  game.hasKeycard = false;
  game.phase = "playing";
  resetLevelEntities(game);
}

export function updateGame(game: Game, input: InputSnapshot, dt: number): GameEvents {
  if (game.phase === "gameover") {
    const events: GameEvents = {
      jumped: false, boinged: null, landed: false, died: false,
      ...NO_EVENTS, partsCollected: [],
    };
    if (input.jumpPressed) {
      restartRun(game);
      events.restarted = true;
    }
    return events;
  }

  const playerEvents = updatePlayer(game.player, game.level, input, dt);
  const events: GameEvents = { ...playerEvents, ...NO_EVENTS, partsCollected: [] };
  const p = game.player;

  const { lobbed } = updateEnemies(game.enemies, game.level, p, dt);
  game.bubbles.push(...lobbed);
  updateBubbles(game.bubbles, game.level, dt);

  // Contact rules.
  if (!p.dead) {
    for (const e of game.enemies) {
      const outcome = contactOutcome(p, e);
      if (outcome === "squish") {
        squish(e);
        game.run.score += SQUISH_SCORE;
        p.vy = -150; // stomp rebound
        p.onGround = false;
        events.squished = true;
      } else if (outcome === "hurt") {
        killPlayer(p);
        events.died = true;
        break;
      }
    }
  }
  if (!p.dead) {
    for (const b of game.bubbles) {
      if (b.alive && aabbOverlap(p, b)) {
        b.alive = false;
        killPlayer(p);
        events.died = true;
        break;
      }
    }
  }

  // Pickups.
  const got = collectItems(p, game.items);
  if (got.caps > 0) {
    game.run.score += got.caps * CAP_SCORE;
    events.capsCollected = got.caps;
  }
  if (got.keycard) {
    game.hasKeycard = true;
    events.gotKeycard = true;
  }
  for (const part of got.parts) {
    game.run.parts[part - 1] = true;
    game.run.score += PART_SCORE;
    events.partsCollected.push(part);
  }

  // Door unlock: keycard in hand + touching a door tile (1px reach).
  if (game.hasKeycard && !p.dead) {
    const c0 = Math.floor((p.x - 1) / TILE_SIZE);
    const c1 = Math.floor((p.x + p.w + 1) / TILE_SIZE);
    const r0 = Math.floor(p.y / TILE_SIZE);
    const r1 = Math.floor((p.y + p.h - 1) / TILE_SIZE);
    outer: for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (
          r >= 0 && r < game.level.height && c >= 0 && c < game.level.width &&
          game.level.tiles[r * game.level.width + c] === TILE.door
        ) {
          unlockDoorAt(game.level, c, r);
          game.hasKeycard = false; // consumed — opens exactly once
          events.doorOpened = true;
          break outer;
        }
      }
    }
  }

  // Exit door.
  if (!p.dead) {
    for (const ex of game.exits) {
      if (aabbOverlap(p, ex)) {
        events.exitReached = true;
        break;
      }
    }
  }

  // Death → respawn-or-game-over.
  if (p.dead && p.deadTime >= DEATH_PAUSE) {
    game.run.lives -= 1;
    if (game.run.lives <= 0) {
      game.phase = "gameover";
      events.gameOver = true;
    } else {
      resetLevelEntities(game);
      events.respawned = true;
    }
  }

  return events;
}

function killPlayer(p: Player): void {
  p.dead = true;
  p.deadTime = 0;
  p.vx = 0;
  p.vy = 0;
}
