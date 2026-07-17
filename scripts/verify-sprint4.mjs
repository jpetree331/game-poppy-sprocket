// scripts/verify-sprint4.mjs — run with: npm run verify:4
//
// Pickups, keycard → door, and run-state persistence in plain Node.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLevel, tileAt, TILE } from "../src/lib/level.ts";
import { createGame, updateGame, newRun } from "../src/lib/game.ts";
import { IDLE_SNAPSHOT } from "../src/lib/input.ts";

const DT = 1 / 60;
const snap = (o = {}) => ({ ...IDLE_SNAPSHOT, ...o });
const run = (g, n, o = {}) => {
  let last;
  for (let i = 0; i < n; i++) last = updateGame(g, snap(o), DT);
  return last;
};

console.log("verify-sprint4:");

// --- soda caps score 100 each ---
{
  const g = createGame(`
;caps
..........
.P..*.*...
##########
`.trim());
  run(g, 60); // settle
  let caps = 0;
  for (let i = 0; i < 300; i++) {
    const ev = updateGame(g, snap({ right: true }), DT);
    caps += ev.capsCollected;
  }
  assert.equal(caps, 2, "both caps collected");
  assert.equal(g.run.score, 200, "100 pts each");
  assert.ok(g.items.every((i) => i.taken));
  console.log("  soda caps: 2 × 100 pts ✓");
}

// --- keycard → door: opens exactly once, consumes the card ---
{
  const g = createGame(`
;door
..........
..........
.P.K...D..
#######D##
##########
`.trim());
  // Wait: D at (7,2) and (7,3)? Row 3 is mostly # with D at col 7 — a 2-tall
  // door embedded in the floor line. Actually row 3 col 7 is D, row 2 col 7 is D.
  run(g, 30);
  assert.equal(tileAt(g.level, 7, 2), TILE.door);
  let opened = false;
  let gotCard = false;
  for (let i = 0; i < 600 && !opened; i++) {
    const ev = updateGame(g, snap({ right: true }), DT);
    gotCard ||= ev.gotKeycard;
    opened ||= ev.doorOpened;
  }
  assert.ok(gotCard, "keycard picked up en route");
  assert.ok(opened, "door must open on touch with keycard");
  assert.ok(!g.hasKeycard, "keycard consumed");
  assert.equal(tileAt(g.level, 7, 2), TILE.empty, "door tile cleared");
  assert.equal(tileAt(g.level, 7, 3), TILE.empty, "whole connected door cleared");
  console.log("  keycard consumed; 2-tall door opens once ✓");
}

// --- door blocks without a keycard ---
{
  const g = createGame(`
;locked
..........
.P.....D..
#######D##
##########
`.trim());
  run(g, 240, { right: true });
  assert.ok(g.player.x + g.player.w <= 7 * 16 + 0.5, "must be stopped by the locked door");
  console.log("  locked door blocks without keycard ✓");
}

// --- ship part: slot fills, 1000 pts, persists across a level load ---
{
  const g = createGame(`
;part
..........
.P...2....
##########
`.trim());
  run(g, 30);
  let got = [];
  for (let i = 0; i < 300; i++) {
    const ev = updateGame(g, snap({ right: true }), DT);
    got = got.concat(ev.partsCollected);
  }
  assert.deepEqual(got, [2], "part 2 collected");
  assert.deepEqual(g.run.parts, [false, true, false, false], "slot 2 filled");
  assert.equal(g.run.score, 1000);

  // Same run object into a new level — progress persists.
  const g2 = createGame(`
;next
..........
.P........
##########
`.trim(), g.run);
  assert.deepEqual(g2.run.parts, [false, true, false, false], "slot 2 persists across level load");
  assert.equal(g2.run.score, 1000, "score persists");
  console.log("  ship part 2 → slot 2 filled, persists across level load ✓");
}

// --- items stay collected across an in-level death ---
{
  const g = createGame(`
;keep
..........
.P..*..^..
#######^##
##########
`.trim());
  run(g, 30);
  let died = false;
  for (let i = 0; i < 600 && !died; i++) {
    died = updateGame(g, snap({ right: true }), DT).died;
  }
  assert.ok(died, "spike death");
  run(g, 60); // respawn
  assert.equal(g.run.lives, 2);
  assert.ok(g.items[0].taken, "cap stays collected after death");
  assert.equal(g.run.score, 100, "score kept");
  console.log("  collected items survive death; score kept ✓");
}

// --- fresh run after game over re-locks doors and clears parts ---
{
  const g = createGame(`
;relock
..........
.......D..
.P.K2..D.^
##########
`.trim());
  let opened = false;
  for (let i = 0; i < 4000 && g.phase !== "gameover"; i++) {
    const ev = updateGame(g, snap({ right: true }), DT);
    opened ||= ev.doorOpened;
  }
  assert.ok(opened, "door opened during the doomed run");
  assert.equal(g.phase, "gameover");
  updateGame(g, snap({ jump: true, jumpPressed: true }), DT);
  assert.equal(tileAt(g.level, 7, 2), TILE.door, "door re-locked on fresh run");
  assert.deepEqual(g.run.parts, [false, false, false, false], "parts cleared on fresh run");
  assert.ok(g.items.every((i) => !i.taken), "items respawned on fresh run");
  console.log("  fresh run re-locks doors, clears parts/items ✓");
}

// --- the shipping level parses with keycard + door + caps ---
{
  const text = readFileSync(new URL("../levels/03-the-drippy-depths.txt", import.meta.url), "utf8");
  const lvl = parseLevel(text);
  const kinds = lvl.spawns.map((s) => s.kind);
  assert.ok(kinds.includes("keycard"), "level 03 needs a keycard");
  assert.ok(kinds.includes("sodaCap"), "level 03 needs caps");
  assert.ok(kinds.includes("exit"), "level 03 needs an exit");
  let doors = 0;
  for (let i = 0; i < lvl.tiles.length; i++) if (lvl.tiles[i] === TILE.door) doors++;
  assert.equal(doors, 2, "level 03 has a 2-tall door");
  console.log(`  levels/03-the-drippy-depths.txt parses (${lvl.width}×${lvl.height}, K + 2-tall D) ✓`);
}

console.log("verify-sprint4: ALL PASS");
