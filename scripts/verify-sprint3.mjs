// scripts/verify-sprint3.mjs — run with: npm run verify:3
//
// Critter spot-checks in plain Node: Prickle-Pig ledge discipline, Globbin
// squish rules, contact lethality, bubble lifecycle, and the full
// death → lives → game-over → restart flow.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TILE_SIZE, parseLevel } from "../src/lib/level.ts";
import { createGame, updateGame } from "../src/lib/game.ts";
import { IDLE_SNAPSHOT } from "../src/lib/input.ts";
import { spawnEnemies, updateEnemies } from "../src/lib/enemies.ts";
import { createPlayer } from "../src/lib/player.ts";

const DT = 1 / 60;
const snap = (o = {}) => ({ ...IDLE_SNAPSHOT, ...o });

console.log("verify-sprint3:");

// --- Prickle-Pig on a 3-tile ledge: 1200 ticks, never walks off ---
{
  // Ledge at cols 4–6, row 5. Pig starts on it. Player parked far away.
  const MAP = `
;pig ledge
..........
..........
..........
..........
....p.....
....###...
..........
..........
.P........
##########
`.trim();
  const level = parseLevel(MAP);
  const enemies = spawnEnemies(level);
  assert.equal(enemies.length, 1);
  const pig = enemies[0];
  const player = createPlayer(level.playerSpawn);
  let turns = 0;
  let lastFacing = pig.facing;
  for (let i = 0; i < 1200; i++) {
    updateEnemies(enemies, level, player, DT);
    if (pig.facing !== lastFacing) {
      turns++;
      lastFacing = pig.facing;
    }
    const onLedge =
      pig.x >= 4 * TILE_SIZE - 0.5 && pig.x + pig.w <= 7 * TILE_SIZE + 0.5;
    assert.ok(onLedge, `tick ${i}: pig left the ledge (x=${pig.x.toFixed(1)})`);
  }
  assert.ok(turns >= 4, `pig should patrol (turned ${turns}×)`);
  console.log(`  Prickle-Pig stayed on a 3-tile ledge for 1200 ticks (${turns} turns) ✓`);
}

// --- Globbin squish: stomp sets dead flag, scores, rebounds Poppy ---
const ARENA = `
;arena
..........
..........
..........
..........
..........
.P...g....
##########
`.trim();
{
  const g = createGame(ARENA);
  // Drop Poppy straight onto the Globbin: teleport her above it, falling.
  const glob = g.enemies[0];
  g.player.x = glob.x + 1;
  g.player.y = glob.y - 30;
  g.player.vy = 120;
  let squished = false;
  for (let i = 0; i < 30 && !squished; i++) {
    const ev = updateGame(g, snap(), DT);
    squished ||= ev.squished;
  }
  assert.ok(squished, "stomp must squish");
  assert.ok(!g.enemies[0]?.alive || g.enemies.length === 0, "globbin dead flag set");
  assert.equal(g.run.score, 200, "squish scores 200");
  assert.ok(g.player.vy < 0, "stomp rebound");
  assert.ok(!g.player.dead, "Poppy survives a stomp");
  console.log("  Globbin squish: dead flag + 200 pts + rebound ✓");
}

// --- Globbin side contact kills ---
{
  const g = createGame(ARENA);
  let died = false;
  for (let i = 0; i < 600 && !died; i++) {
    const ev = updateGame(g, snap({ right: true }), DT);
    died ||= ev.died;
  }
  assert.ok(died, "walking into a Globbin must hurt");
  console.log("  Globbin side contact kills ✓");
}

// --- full lives flow: 3 deaths → game over → jump restarts fresh ---
{
  const g = createGame(ARENA);
  let gameOver = false;
  let respawns = 0;
  for (let i = 0; i < 3000 && !gameOver; i++) {
    const ev = updateGame(g, snap({ right: true }), DT); // keep walking into it
    if (ev.respawned) respawns++;
    gameOver ||= ev.gameOver;
  }
  assert.ok(gameOver, "must reach game over");
  assert.equal(respawns, 2, "two respawns before the third death ends the run");
  assert.equal(g.phase, "gameover");
  // Restart from game over.
  const ev = updateGame(g, snap({ jump: true, jumpPressed: true }), DT);
  assert.ok(ev.restarted, "jump restarts");
  assert.equal(g.run.lives, 3);
  assert.equal(g.run.score, 0);
  assert.equal(g.phase, "playing");
  assert.equal(g.enemies.length, 1, "enemies respawned");
  console.log("  3 deaths → game over → jump → fresh run ✓");
}

// --- Janitor-Bot lobs; bubbles pop on tiles ---
const BOT = `
;bot
..........
..........
..........
..........
.P.....j..
##########
`.trim();
{
  const g = createGame(BOT);
  let sawBubble = false;
  let popped = false;
  for (let i = 0; i < 60 * 8; i++) {
    updateGame(g, snap(), DT);
    if (g.bubbles.length > 0) sawBubble = true;
    if (sawBubble && g.bubbles.length === 0) {
      popped = true;
      break;
    }
  }
  assert.ok(sawBubble, "bot must lob a bubble within the window");
  assert.ok(popped, "bubble must pop on tiles");
  console.log("  Janitor-Bot lobs; bubble pops on tiles ✓");
}

// --- the shipping level parses with all three critters ---
{
  const text = readFileSync(new URL("../levels/02-suds-canyon.txt", import.meta.url), "utf8");
  const lvl = parseLevel(text);
  const kinds = lvl.spawns.map((s) => s.kind);
  assert.ok(kinds.includes("globbin"), "level 02 needs a Globbin");
  assert.ok(kinds.includes("pricklePig"), "level 02 needs a Prickle-Pig");
  assert.ok(kinds.includes("janitorBot"), "level 02 needs a Janitor-Bot");
  assert.ok(kinds.includes("exit"), "level 02 needs an exit");
  console.log(`  levels/02-suds-canyon.txt parses (${lvl.width}×${lvl.height}, all critters) ✓`);
}

console.log("verify-sprint3: ALL PASS");
