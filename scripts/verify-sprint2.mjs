// scripts/verify-sprint2.mjs — run with: npm run verify:2
//
// Scripted-input simulation of Poppy's kinematics in plain Node: jump apexes
// for normal and boing jumps, coyote time, jump buffering, variable jump
// height, and the two feel benchmarks (3-tile gap flat-footed, 5-tile gap on
// the boot).

import assert from "node:assert/strict";
import { parseLevel, TILE_SIZE } from "../src/lib/level.ts";
import { createGame, updateGame } from "../src/lib/game.ts";
import { IDLE_SNAPSHOT } from "../src/lib/input.ts";

const DT = 1 / 60;

function snap(overrides = {}) {
  return { ...IDLE_SNAPSHOT, ...overrides };
}

/** Run one tick with the given snapshot fields. */
function tick(game, overrides = {}) {
  return updateGame(game, snap(overrides), DT);
}

function settle(game, ticks = 120) {
  for (let i = 0; i < ticks; i++) tick(game);
  assert.ok(game.player.onGround, "player should settle onto the ground");
}

// A flat runway with plenty of headroom.
const FLAT = `
;flat
....................
....................
....................
....................
....................
....................
....................
....................
....................
.P..................
####################
`.trim();

console.log("verify-sprint2:");

// --- normal jump apex: v²/2g = 250²/1600 ≈ 39 px ---
{
  const g = createGame(FLAT);
  settle(g);
  const groundY = g.player.y;
  tick(g, { jump: true, jumpPressed: true });
  let minY = g.player.y;
  for (let i = 0; i < 600; i++) {
    tick(g, { jump: true });
    minY = Math.min(minY, g.player.y);
  }
  const rise = groundY - minY;
  assert.ok(rise >= 34 && rise <= 44, `normal jump apex ${rise.toFixed(1)}px (want 34–44)`);
  console.log(`  normal jump apex ${rise.toFixed(1)}px ✓`);
}

// --- boing big bounce apex: 355²/1600 ≈ 79 px, ~2× normal ---
{
  const g = createGame(FLAT);
  settle(g);
  const groundY = g.player.y;
  tick(g, { boingPressed: true }); // toggles boot, self-starts a small bounce
  // Hold jump through the first landing → big bounce; then measure.
  let bounced = false;
  let minY = Infinity;
  for (let i = 0; i < 600; i++) {
    const ev = tick(g, { jump: true });
    if (ev.boinged === "big") bounced = true;
    if (bounced) minY = Math.min(minY, g.player.y);
  }
  assert.ok(bounced, "holding jump at contact must trigger a big boing");
  const rise = groundY - minY;
  assert.ok(rise >= 72 && rise <= 88, `big boing apex ${rise.toFixed(1)}px (want 72–88)`);
  console.log(`  big boing apex ${rise.toFixed(1)}px (~2× normal) ✓`);
}

// --- coyote time: jump 4 ticks (67ms) after walking off a ledge works ---
const LEDGE = `
;ledge
....................
....................
....................
.P..................
######..............
....................
....................
....................
....................
....................
####################
`.trim();
{
  const g = createGame(LEDGE);
  settle(g);
  // Walk right until airborne.
  let guard = 0;
  while (g.player.onGround && guard++ < 600) tick(g, { right: true });
  assert.ok(guard < 600, "must walk off the ledge");
  for (let i = 0; i < 4; i++) tick(g); // 67ms falling
  tick(g, { jump: true, jumpPressed: true });
  assert.ok(g.player.vy < -200, `coyote jump must fire (vy=${g.player.vy.toFixed(0)})`);
  console.log("  coyote jump at 67ms after ledge ✓");
}
{
  const g = createGame(LEDGE);
  settle(g);
  let guard = 0;
  while (g.player.onGround && guard++ < 600) tick(g, { right: true });
  for (let i = 0; i < 8; i++) tick(g); // 133ms — past the 80ms window
  tick(g, { jump: true, jumpPressed: true });
  assert.ok(g.player.vy > 0, `late jump must NOT fire (vy=${g.player.vy.toFixed(0)})`);
  console.log("  no coyote jump at 133ms ✓");
}

// --- jump buffering: press while falling, jump fires on landing ---
{
  const g = createGame(FLAT);
  settle(g);
  tick(g, { jump: true, jumpPressed: true });
  // rise and start falling
  while (g.player.vy < 0) tick(g);
  // buffer a second press mid-fall, close to the ground
  while (g.player.y < TILE_SIZE * 9 + 2 - 20) tick(g); // within ~20px of rest height
  let ev = tick(g, { jump: true, jumpPressed: true });
  let jumped = ev.jumped;
  for (let i = 0; i < 6 && !jumped; i++) {
    ev = tick(g, { jump: true });
    jumped ||= ev.jumped;
  }
  assert.ok(jumped, "buffered press must fire on landing");
  console.log("  jump buffer fires on landing ✓");
}

// --- variable height: early release cuts the apex ---
{
  const g = createGame(FLAT);
  settle(g);
  const groundY = g.player.y;
  tick(g, { jump: true, jumpPressed: true });
  for (let i = 0; i < 5; i++) tick(g, { jump: true });
  tick(g, { jumpReleased: true });
  let minY = g.player.y;
  for (let i = 0; i < 300; i++) {
    tick(g);
    minY = Math.min(minY, g.player.y);
  }
  const rise = groundY - minY;
  assert.ok(rise < 30, `cut jump apex ${rise.toFixed(1)}px must be well under full 39px`);
  console.log(`  cut jump apex ${rise.toFixed(1)}px ✓`);
}

// --- feel benchmark: clear a 3-tile gap flat-footed ---
const GAP3 = `
;gap3
....................
....................
....................
....................
....................
....................
....................
.P..................
#####...############
#####...############
`.trim();
{
  const g = createGame(GAP3);
  settle(g);
  // Run right; jump right at the edge (col 4 ends at x=80).
  let jumped = false;
  let fellInGap = false;
  for (let i = 0; i < 600; i++) {
    const nearEdge = g.player.x + g.player.w >= 5 * TILE_SIZE - 2;
    const ev = tick(g, {
      right: true,
      jump: jumped,
      jumpPressed: !jumped && nearEdge && g.player.onGround,
    });
    if (ev.jumped) jumped = true;
    if (g.player.y > 8 * TILE_SIZE - g.player.h + 1) fellInGap = true;
    if (jumped && g.player.onGround) break;
  }
  assert.ok(jumped, "must have jumped at the edge");
  assert.ok(!fellInGap, "must clear a 3-tile gap flat-footed");
  assert.ok(g.player.x > 8 * TILE_SIZE, `must land beyond the gap (x=${g.player.x.toFixed(0)})`);
  console.log("  clears 3-tile gap flat-footed ✓");
}

// --- feel benchmark: clear a 5-tile gap on the boot ---
const GAP5 = `
;gap5
....................
....................
....................
....................
....................
....................
....................
.P..................
#####.....##########
#####.....##########
`.trim();
{
  const g = createGame(GAP5);
  settle(g);
  tick(g, { boingPressed: true });
  let fellInGap = false;
  let crossed = false;
  for (let i = 0; i < 900; i++) {
    tick(g, { right: true, jump: true }); // boot mode: hold jump, ride the bounces
    if (g.player.y > 8 * TILE_SIZE - g.player.h + 1) fellInGap = true;
    if (g.player.x > 10 * TILE_SIZE + 4) {
      crossed = true;
      break;
    }
  }
  assert.ok(!fellInGap && crossed, `must clear a 5-tile gap on the boot (x=${g.player.x.toFixed(0)}, fell=${fellInGap})`);
  console.log("  clears 5-tile gap on the boing boot ✓");
}

// --- spikes kill, lives tick down, respawn at P ---
const SPIKE = `
;spike
....................
....................
....................
.P..................
###^################
`.trim();
{
  const g = createGame(SPIKE);
  settle(g);
  const ev0 = { died: false };
  let died = false;
  for (let i = 0; i < 300 && !died; i++) {
    const ev = tick(g, { right: true });
    died ||= ev.died;
  }
  assert.ok(died, "walking into spikes must kill");
  assert.equal(g.lives, 3, "lives decrement happens at respawn, not death");
  let respawned = false;
  for (let i = 0; i < 60 && !respawned; i++) {
    const ev = tick(g);
    respawned ||= ev.respawned;
  }
  assert.ok(respawned, "must respawn after the death pause");
  assert.equal(g.lives, 2, "one life lost");
  assert.ok(Math.abs(g.player.x - (1 * TILE_SIZE + 2)) < 3, "respawn at P");
  void ev0;
  console.log("  spike death → 1 life lost → respawn at P ✓");
}

console.log("verify-sprint2: ALL PASS");
