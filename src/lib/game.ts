// src/lib/game.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Owns one level's worth of sim: the parsed map, Poppy, the critters, score
// and lives. Death is never a hard fail: respawn at the level spawn (level
// entities reset too), lose one of 3 lives; at 0 the run enters "gameover"
// and jump returns to a fresh run (the title screen proper lands in
// Sprint 6 — until then game-over → fresh run IS the placeholder title).

import type { InputSnapshot } from "./input.ts";
import { parseLevel, type LevelData } from "./level.ts";
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

export type GamePhase = "playing" | "gameover";

export interface Game {
  level: LevelData;
  player: Player;
  enemies: Enemy[];
  bubbles: Bubble[];
  lives: number;
  score: number;
  phase: GamePhase;
}

export interface GameEvents extends PlayerEvents {
  respawned: boolean;
  squished: boolean;
  gameOver: boolean;
  /** A fresh run started from the game-over screen. */
  restarted: boolean;
}

const NO_EVENTS: Omit<GameEvents, keyof PlayerEvents> = {
  respawned: false,
  squished: false,
  gameOver: false,
  restarted: false,
};

export function createGame(levelText: string): Game {
  const level = parseLevel(levelText);
  return {
    level,
    player: createPlayer(level.playerSpawn),
    enemies: spawnEnemies(level),
    bubbles: [],
    lives: STARTING_LIVES,
    score: 0,
    phase: "playing",
  };
}

/** Reset the level's inhabitants (used on respawn — "respawn at level start"). */
function resetLevelEntities(game: Game): void {
  game.enemies = spawnEnemies(game.level);
  game.bubbles = [];
  respawnPlayer(game.player, game.level.playerSpawn);
}

export function updateGame(game: Game, input: InputSnapshot, dt: number): GameEvents {
  if (game.phase === "gameover") {
    const events: GameEvents = {
      jumped: false, boinged: null, landed: false, died: false, ...NO_EVENTS,
    };
    if (input.jumpPressed) {
      game.lives = STARTING_LIVES;
      game.score = 0;
      game.phase = "playing";
      resetLevelEntities(game);
      events.restarted = true;
    }
    return events;
  }

  const playerEvents = updatePlayer(game.player, game.level, input, dt);
  const events: GameEvents = { ...playerEvents, ...NO_EVENTS };
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
        game.score += SQUISH_SCORE;
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

  // Death → respawn-or-game-over.
  if (p.dead && p.deadTime >= DEATH_PAUSE) {
    game.lives -= 1;
    if (game.lives <= 0) {
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
