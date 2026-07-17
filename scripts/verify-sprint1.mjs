// scripts/verify-sprint1.mjs — run with: npm run verify:1
//
// Plain-Node spot checks for the tilemap + collision sprint: parsing, a body
// dropped onto a floor lands on the expected row, platforms block from above
// but not from below, spikes register, and fast bodies don't tunnel.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLevel, tileAt, TILE, TILE_SIZE } from "../src/lib/level.ts";
import { applyGravity, moveBody, overlapsSpike } from "../src/lib/physics.ts";

console.log("verify-sprint1:");

const MAP = `
;test map
..........
..........
..P.......
..........
...====...
..........
....^^....
##########
`.trim();

const level = parseLevel(MAP);
assert.equal(level.width, 10);
assert.equal(level.height, 8);
assert.deepEqual(level.playerSpawn, { col: 2, row: 2 });
assert.equal(tileAt(level, 0, 7), TILE.solid);
assert.equal(tileAt(level, 3, 4), TILE.platform);
assert.equal(tileAt(level, 4, 6), TILE.spike);
assert.equal(tileAt(level, -1, 0), TILE.solid, "left OOB is solid");
assert.equal(tileAt(level, 0, -3), TILE.empty, "above top is empty");
assert.equal(tileAt(level, 0, 99), TILE.solid, "below bottom is solid");
console.log("  parse + edge rules ✓");

function makeBody(x, y) {
  return { x, y, w: 12, h: 14, vx: 0, vy: 0, onGround: false };
}
function tick(body, lvl, n = 1) {
  let last;
  for (let i = 0; i < n; i++) {
    applyGravity(body, 1 / 60);
    last = moveBody(body, lvl, 1 / 60);
  }
  return last;
}

// --- drop onto the solid floor: must land with feet exactly on row 7's top ---
{
  const b = makeBody(8 * TILE_SIZE, 1 * TILE_SIZE);
  tick(b, level, 180); // 3 seconds, plenty
  assert.equal(b.y + b.h, 7 * TILE_SIZE, "feet must rest on floor top");
  assert.ok(b.onGround, "must be grounded");
  console.log("  drop lands on expected row ✓");
}

// --- platform: falling from above lands on it ---
{
  const b = makeBody(4 * TILE_SIZE, 1 * TILE_SIZE);
  tick(b, level, 180);
  assert.equal(b.y + b.h, 4 * TILE_SIZE, "feet must rest on platform top");
  assert.ok(b.onGround);
  console.log("  platform blocks from above ✓");
}

// --- platform: jumping up through it must NOT block ---
{
  const b = makeBody(4 * TILE_SIZE, 6 * TILE_SIZE);
  b.vy = -320; // rises ~64px — enough to carry the feet above the platform row
  let minY = b.y;
  for (let i = 0; i < 30; i++) {
    applyGravity(b, 1 / 60);
    moveBody(b, level, 1 / 60);
    minY = Math.min(minY, b.y);
  }
  assert.ok(
    minY + b.h < 4 * TILE_SIZE,
    `body must pass up through platform (minY=${minY})`,
  );
  console.log("  platform passable from below ✓");
}

// --- spikes register ---
{
  const b = makeBody(4 * TILE_SIZE + 2, 6 * TILE_SIZE + 2);
  assert.ok(overlapsSpike(b, level), "body inside spike tile must register");
  const clear = makeBody(0, 0);
  assert.ok(!overlapsSpike(clear, level));
  console.log("  spike overlap ✓");
}

// --- no tunneling: absurd downward velocity still lands on the floor ---
{
  const b = makeBody(8 * TILE_SIZE, 0);
  for (let i = 0; i < 5; i++) {
    b.vy = 5000; // 83 px per tick — would skip whole tiles without sub-stepping
    moveBody(b, level, 1 / 60);
  }
  assert.equal(b.y + b.h, 7 * TILE_SIZE, "fast body must not tunnel the floor");
  console.log("  no tunneling at 5000 px/s ✓");
}

// --- the real shipping level parses and is rectangular ---
{
  const text = readFileSync(new URL("../levels/01-crash-site.txt", import.meta.url), "utf8");
  const l1 = parseLevel(text);
  assert.equal(l1.width, 60, `level 01 width (got ${l1.width})`);
  assert.equal(l1.height, 12);
  assert.ok(l1.spawns.some((s) => s.kind === "exit"), "level 01 needs an exit");
  console.log(`  levels/01-crash-site.txt parses (${l1.width}×${l1.height}, exit present) ✓`);
}

console.log("verify-sprint1: ALL PASS");
