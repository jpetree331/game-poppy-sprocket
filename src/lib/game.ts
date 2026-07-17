// src/lib/game.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Owns one level's worth of sim: the parsed map, Poppy, and the lives
// counter. Death is never a hard fail: respawn at the level spawn, lose one
// of 3 lives. (The real game-over → title flow arrives in Sprint 3; until
// then lives refill at 0 so the sandbox stays playable.)

import type { InputSnapshot } from "./input.ts";
import { parseLevel, type LevelData } from "./level.ts";
import {
  createPlayer,
  respawnPlayer,
  updatePlayer,
  DEATH_PAUSE,
  type Player,
  type PlayerEvents,
} from "./player.ts";

export const STARTING_LIVES = 3;

export interface Game {
  level: LevelData;
  player: Player;
  lives: number;
}

export interface GameEvents extends PlayerEvents {
  respawned: boolean;
  /** Lives ran out this tick (placeholder handling until Sprint 3). */
  gameOver: boolean;
}

export function createGame(levelText: string): Game {
  const level = parseLevel(levelText);
  return {
    level,
    player: createPlayer(level.playerSpawn),
    lives: STARTING_LIVES,
  };
}

export function updateGame(game: Game, input: InputSnapshot, dt: number): GameEvents {
  const playerEvents = updatePlayer(game.player, game.level, input, dt);
  const events: GameEvents = { ...playerEvents, respawned: false, gameOver: false };

  if (game.player.dead && game.player.deadTime >= DEATH_PAUSE) {
    game.lives -= 1;
    if (game.lives <= 0) {
      events.gameOver = true;
      game.lives = STARTING_LIVES; // Sprint 3 replaces this with game-over → title
    }
    respawnPlayer(game.player, game.level.playerSpawn);
    events.respawned = true;
  }

  return events;
}
