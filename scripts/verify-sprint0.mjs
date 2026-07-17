// scripts/verify-sprint0.mjs — run with: npm run verify:0
// (node --experimental-strip-types scripts/verify-sprint0.mjs)
//
// Proves the Sprint 0 lib/ contract: palette and loop import in plain Node
// with no DOM, and the fixed timestep produces the same update count no
// matter how irregular the frame cadence is.

import assert from "node:assert/strict";
import { PALETTE } from "../src/lib/palette.ts";
import { createLoop } from "../src/lib/loop.ts";

// --- palette ---
assert.equal(PALETTE.length, 16, "palette must have exactly 16 colors");
assert.equal(new Set(PALETTE).size, 16, "palette colors must be unique");
for (const hex of PALETTE) {
  assert.match(hex, /^#[0-9A-Fa-f]{6}$/, `bad hex literal: ${hex}`);
}

// --- fixed timestep ---
// Feed 2 simulated seconds of frames at three different cadences (smooth
// 60fps, chunky 20fps as if CPU-throttled 6x, and jittery). Update count
// must be ~120 in every case; render alpha always in [0,1).
function runCadence(name, frameTimesMs) {
  let updates = 0;
  const loop = createLoop({
    update(dt) {
      assert.equal(dt, loop.step, "update dt must be the fixed step");
      updates++;
    },
    render(alpha) {
      assert.ok(alpha >= 0 && alpha < 1, `alpha out of range: ${alpha}`);
    },
  });
  for (const t of frameTimesMs) loop.frame(t);
  assert.ok(
    Math.abs(updates - 120) <= 1,
    `${name}: expected ~120 updates over 2s, got ${updates}`,
  );
  console.log(`  ${name}: ${updates} updates over 2 simulated seconds ✓`);
}

const smooth = Array.from({ length: 121 }, (_, i) => i * (1000 / 60));
const throttled = Array.from({ length: 41 }, (_, i) => i * 50); // 20 fps
let t = 0;
const jittery = [0];
const jitterPattern = [9, 33, 12, 41, 8, 25, 17, 30];
while (t < 2000) {
  t += jitterPattern[jittery.length % jitterPattern.length];
  jittery.push(Math.min(t, 2000));
}

console.log("verify-sprint0:");
runCadence("smooth 60fps", smooth);
runCadence("throttled 20fps", throttled);
runCadence("jittery", jittery);

// --- long-gap clamp: a 10s stall must not spiral into 600 updates ---
{
  let updates = 0;
  const loop = createLoop({ update: () => updates++, render: () => {} });
  loop.frame(0);
  loop.frame(10_000);
  assert.ok(updates <= 16, `stall clamp failed: ${updates} updates after 10s gap`);
  console.log(`  10s stall clamped to ${updates} updates ✓`);
}

console.log("verify-sprint0: ALL PASS");
