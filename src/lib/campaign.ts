// src/lib/campaign.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// GATE B resolved to its default: a level-select screen chains the levels.
// The walkable overworld is SEAM ONLY — see the Overworld stub at the bottom;
// nothing here implements it and nothing else may this phase.
//
// Flow: select → (jump) → game → exit reached → select (slot gets a ✓)…
// until all four ship parts are home → the launch cutscene → card →
// (jump) → fresh run at select. Game over inside a level also returns to
// select with a fresh run — death is never a hard fail.

import type { InputSnapshot } from "./input.ts";
import { createGame, newRun, updateGame, type Game, type GameEvents, type RunState } from "./game.ts";
import { parseLevel } from "./level.ts";
import type { PartId } from "./items.ts";

export interface LevelEntry {
  /** Display name, e.g. "CRASH SITE". */
  name: string;
  text: string;
}

export type Screen = "select" | "game" | "gameover" | "win";

/** Seconds of launch cutscene before the card accepts input. */
export const WIN_CUTSCENE_LOCK = 7;

export interface Campaign {
  entries: LevelEntry[];
  /** Which ship part each level holds (from its spawn list), for the select UI. */
  partByLevel: Array<PartId | null>;
  completed: boolean[];
  run: RunState;
  screen: Screen;
  cursor: number;
  /** Active level index + game while screen === "game"/"gameover". */
  current: number;
  game: Game | null;
  /** Cutscene clock while screen === "win". */
  winTime: number;
}

export interface CampaignEvents {
  levelStarted: boolean;
  levelCompleted: boolean;
  won: boolean;
  runReset: boolean;
  game: GameEvents | null;
}

export function createCampaign(entries: LevelEntry[]): Campaign {
  const partByLevel = entries.map((e) => {
    const spawn = parseLevel(e.text).spawns.find((s) => s.kind === "shipPart");
    return spawn?.part ?? null;
  });
  return {
    entries,
    partByLevel,
    completed: entries.map(() => false),
    run: newRun(),
    screen: "select",
    cursor: 0,
    current: 0,
    game: null,
    winTime: 0,
  };
}

function freshRun(c: Campaign): void {
  c.run = newRun();
  c.completed = c.entries.map(() => false);
  c.game = null;
  c.screen = "select";
  c.winTime = 0;
}

export function updateCampaign(c: Campaign, input: InputSnapshot, dt: number): CampaignEvents {
  const events: CampaignEvents = {
    levelStarted: false,
    levelCompleted: false,
    won: false,
    runReset: false,
    game: null,
  };

  switch (c.screen) {
    case "select": {
      if (input.leftPressed) c.cursor = (c.cursor + c.entries.length - 1) % c.entries.length;
      if (input.rightPressed) c.cursor = (c.cursor + 1) % c.entries.length;
      if (input.jumpPressed) {
        c.current = c.cursor;
        c.game = createGame(c.entries[c.current].text, c.run);
        c.screen = "game";
        events.levelStarted = true;
      }
      break;
    }
    case "game": {
      if (!c.game) break; // unreachable; defensive
      const ev = updateGame(c.game, input, dt);
      events.game = ev;
      if (ev.gameOver) {
        c.screen = "gameover";
      } else if (ev.exitReached) {
        c.completed[c.current] = true;
        events.levelCompleted = true;
        c.game = null;
        if (c.run.parts.every(Boolean)) {
          c.screen = "win";
          c.winTime = 0;
          events.won = true;
        } else {
          c.cursor = c.current;
          c.screen = "select";
        }
      }
      break;
    }
    case "gameover": {
      if (input.jumpPressed) {
        freshRun(c);
        events.runReset = true;
      }
      break;
    }
    case "win": {
      c.winTime += dt;
      if (c.winTime >= WIN_CUTSCENE_LOCK && input.jumpPressed) {
        freshRun(c);
        events.runReset = true;
      }
      break;
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// OVERWORLD SEAM (GATE B) — interface only, deliberately unimplemented.
// A future walkable overworld replaces the "select" screen by implementing
// this shape and mapping node → level index. Nothing in this phase may
// implement it; the level-select screen is the shipping default.
// ---------------------------------------------------------------------------
export interface OverworldSeam {
  /** World-map node currently under Poppy's feet. */
  nodeAt(x: number, y: number): number | null;
  /** Walkability mask for the map screen. */
  canWalk(x: number, y: number): boolean;
}
